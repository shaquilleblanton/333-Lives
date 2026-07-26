import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { communityCalendarTable, insertCommunityEventSchema, updateCommunityEventSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

/**
 * Community calendar — circle-facing view.
 *
 * Privacy tiers:
 *   open      → full details
 *   scheduled → full details
 *   locked    → masked to "Busy" (title/description hidden)
 *   private   → excluded entirely (stored in DB but never returned)
 *
 * Private availability belongs in the personal calendar (events table).
 *
 * Legacy fields (isOpenDay, isPublic):
 *   These columns remain in the DB for the migration window and are derived
 *   from windowType on every write. They are no longer part of the API
 *   request/response surface.
 *
 * Backfill SQL (already executed, 5 rows updated):
 *   UPDATE community_calendar
 *   SET window_type = CASE
 *     WHEN is_open_day = true THEN 'open'
 *     WHEN is_public = false  THEN 'private'
 *     ELSE 'scheduled'
 *   END
 *   WHERE window_type = 'scheduled';
 */

type CommunityWindowType = "open" | "locked" | "scheduled";

function resolveWindowType(ev: {
  windowType: string | null;
  isOpenDay: boolean;
  isPublic: boolean;
}): string {
  if (ev.windowType === "open" || ev.windowType === "locked") return ev.windowType;
  // Fallback for rows predating the windowType column
  if (ev.isOpenDay) return "open";
  if (!ev.isPublic) return "private";
  return "scheduled";
}

/**
 * Apply circle-view visibility:
 *   private → null (excluded from response)
 *   locked  → masked to "Busy"
 *   open/scheduled → returned as-is with resolved windowType
 */
function applyCircleVisibility(ev: typeof communityCalendarTable.$inferSelect) {
  const wt = resolveWindowType(ev);
  if (wt === "private") return null;
  if (wt === "locked") {
    return { ...ev, windowType: "locked" as const, title: "Busy", description: null, requestedBy: null };
  }
  return { ...ev, windowType: wt as CommunityWindowType };
}

/** Derive legacy boolean columns from the new windowType. */
function legacyFields(wt: string) {
  return { isOpenDay: wt === "open", isPublic: wt !== "private" };
}

router.get("/community", async (req, res) => {
  const { startDate, endDate, category } = req.query as Record<string, string>;
  let rows = await db.select().from(communityCalendarTable)
    .where(eq(communityCalendarTable.userId, getUserId(req)));
  if (startDate) rows = rows.filter(e => e.startDate >= startDate);
  if (endDate)   rows = rows.filter(e => e.startDate <= endDate);
  if (category)  rows = rows.filter(e => e.category === category);
  rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const visible = rows.map(applyCircleVisibility).filter((e): e is NonNullable<typeof e> => e !== null);
  return res.json(visible);
});

router.get("/community/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const rows = await db.select().from(communityCalendarTable)
    .where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
  const visible = applyCircleVisibility(rows[0]!);
  if (!visible) return res.status(404).json({ error: "Event not found" });
  return res.json(visible);
});

router.post("/community", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const windowType = (body.windowType ?? "scheduled") as CommunityWindowType;
  const parsed = insertCommunityEventSchema.safeParse({ ...body, userId: getUserId(req), windowType });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(communityCalendarTable)
    .values({ ...parsed.data, ...legacyFields(windowType) })
    .returning();
  return res.status(201).json(applyCircleVisibility(inserted[0]!));
});

router.put("/community/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const body = req.body as Record<string, unknown>;
  const parsed = updateCommunityEventSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const legacy = parsed.data.windowType ? legacyFields(parsed.data.windowType) : {};
  const updated = await db.update(communityCalendarTable)
    .set({ ...parsed.data, ...legacy, updatedAt: new Date() })
    .where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(applyCircleVisibility(updated[0]!));
});

router.post("/community/:id/respond", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const { status } = req.body;
  if (!["confirmed", "declined", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const updated = await db.update(communityCalendarTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.delete("/community/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  await db.delete(communityCalendarTable)
    .where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
