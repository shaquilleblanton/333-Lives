import { Router } from "express";
import { db } from "@workspace/db";
import { communityCalendarTable, insertCommunityEventSchema, updateCommunityEventSchema } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/community", async (req, res) => {
  const { startDate, endDate, category } = req.query as Record<string, string>;
  let rows = await db.select().from(communityCalendarTable).where(eq(communityCalendarTable.userId, DEFAULT_USER_ID));
  if (startDate) rows = rows.filter(e => e.startDate >= startDate);
  if (endDate) rows = rows.filter(e => e.startDate <= endDate);
  if (category) rows = rows.filter(e => e.category === category);
  return res.json(rows.sort((a, b) => a.startDate.localeCompare(b.startDate)));
});

router.get("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(communityCalendarTable).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, DEFAULT_USER_ID))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(rows[0]);
});

router.post("/community", async (req, res) => {
  const parsed = insertCommunityEventSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(communityCalendarTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateCommunityEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(communityCalendarTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.post("/community/:id/respond", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["confirmed", "declined", "pending"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const updated = await db.update(communityCalendarTable).set({ status, updatedAt: new Date() }).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.delete("/community/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(communityCalendarTable).where(and(eq(communityCalendarTable.id, id), eq(communityCalendarTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
