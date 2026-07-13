import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { communityCalendarTable, insertCommunityEventSchema, updateCommunityEventSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

type WindowType = "open" | "locked" | "scheduled" | "private";

type CommunityRow = typeof communityCalendarTable.$inferSelect;

/**
 * Apply community (circle) visibility rules:
 *  - private  → excluded entirely
 *  - locked   → title replaced with "Busy", description cleared, requestedBy cleared
 *  - open / scheduled → returned as-is
 */
function applyCircleVisibility(events: CommunityRow[]): CommunityRow[] {
  return events.reduce<CommunityRow[]>((acc, ev) => {
    const wt = (ev.windowType ?? (ev.isOpenDay ? "open" : "scheduled")) as WindowType;
    if (wt === "private") return acc;
    if (wt === "locked") {
      acc.push({ ...ev, title: "Busy", description: null, requestedBy: null });
      return acc;
    }
    acc.push(ev);
    return acc;
  }, []);
}

router.get("/community", async (req, res) => {
  const { startDate, endDate, category } = req.query as Record<string, string>;
  let rows = await db.select().from(communityCalendarTable).where(eq(communityCalendarTable.userId, getUserId(req)));
  if (startDate) rows = rows.filter(e => e.startDate >= startDate);
  if (endDate) rows = rows.filter(e => e.startDate <= endDate);
  if (category) rows = rows.filter(e => e.category === category);
  const sorted = rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return res.json(applyCircleVisibility(sorted));
});

router.get("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(communityCalendarTable).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, getUserId(req)))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(rows[0]);
});

router.post("/community", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const windowType = (body.windowType ?? "scheduled") as WindowType;
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
