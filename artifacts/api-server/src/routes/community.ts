import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { communityCalendarTable, insertCommunityEventSchema, updateCommunityEventSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

type WindowType = "open" | "locked" | "scheduled" | "private";

/**
 * Derive the effective windowType for a row, falling back to legacy boolean
 * flags for any rows created before the windowType column existed.
 *
 * Migration note: existing rows were backfilled via SQL:
 *   UPDATE community_calendar
 *   SET window_type = CASE
 *     WHEN is_open_day = true THEN 'open'
 *     WHEN is_public = false  THEN 'private'
 *     ELSE 'scheduled'
 *   END
 *   WHERE window_type = 'scheduled';
 * This fallback is kept as a defensive layer for any edge-case rows.
 */
function resolveWindowType(ev: { windowType: string | null; isOpenDay: boolean; isPublic: boolean }): WindowType {
  if (ev.windowType && ev.windowType !== "scheduled") return ev.windowType as WindowType;
  if (ev.isOpenDay) return "open";
  if (!ev.isPublic) return "private";
  return (ev.windowType ?? "scheduled") as WindowType;
}

/**
 * GET /community — owner management view.
 * Returns ALL of the authenticated user's own community events (including
 * private and locked), with windowType resolved from legacy flags where needed.
 * Privacy-tier visibility filtering (hide private, mask locked) is applied at
 * the display layer so the owner can still manage events of any tier.
 *
 * Future circle-view endpoint (GET /community/circle) will apply server-side
 * masking for true multi-user sharing.
 */
router.get("/community", async (req, res) => {
  const { startDate, endDate, category } = req.query as Record<string, string>;
  let rows = await db.select().from(communityCalendarTable).where(eq(communityCalendarTable.userId, getUserId(req)));
  if (startDate) rows = rows.filter(e => e.startDate >= startDate);
  if (endDate) rows = rows.filter(e => e.startDate <= endDate);
  if (category) rows = rows.filter(e => e.category === category);
  const sorted = rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
  // Normalise windowType in-memory so clients always receive a resolved value
  return res.json(sorted.map(ev => ({ ...ev, windowType: resolveWindowType(ev) })));
});

router.get("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(communityCalendarTable).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req)))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
  const ev = rows[0]!;
  return res.json({ ...ev, windowType: resolveWindowType(ev) });
});

router.post("/community", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const windowType = (body.windowType ?? "scheduled") as WindowType;
  // Keep legacy booleans in sync so existing consumers that read them still work
  const isOpenDay = windowType === "open";
  const isPublic = windowType !== "private";
  const parsed = insertCommunityEventSchema.safeParse({ ...body, userId: getUserId(req), windowType, isOpenDay, isPublic });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(communityCalendarTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = { ...body };
  if (body.windowType) {
    const wt = body.windowType as WindowType;
    patch.isOpenDay = wt === "open";
    patch.isPublic = wt !== "private";
  }
  const parsed = updateCommunityEventSchema.safeParse(patch);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(communityCalendarTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.post("/community/:id/respond", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["confirmed", "declined", "pending"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const updated = await db.update(communityCalendarTable).set({ status, updatedAt: new Date() }).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.delete("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(communityCalendarTable).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
