import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { gratitudeEntriesTable, insertGratitudeEntrySchema, updateGratitudeEntrySchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayDate } from "../lib/date";

const router = Router();

router.get("/gratitude", async (req, res) => {
  const date = req.query.date as string | undefined;
  const filters = [eq(gratitudeEntriesTable.userId, getUserId(req))];
  if (date) filters.push(eq(gratitudeEntriesTable.date, date));
  const rows = await db.select().from(gratitudeEntriesTable).where(and(...filters));
  return res.json(rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

router.get("/gratitude/today", async (req, res) => {
  const today = getTodayDate(req);
  const rows = await db.select().from(gratitudeEntriesTable).where(and(eq(gratitudeEntriesTable.userId, getUserId(req)), eq(gratitudeEntriesTable.date, today))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "No gratitude entry for today" });
  return res.json(rows[0]);
});

router.post("/gratitude", async (req, res) => {
  const date = req.body.date || getTodayDate(req);
  const parsed = insertGratitudeEntrySchema.safeParse({ ...req.body, userId: getUserId(req), date });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(gratitudeEntriesTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/gratitude/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const parsed = updateGratitudeEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(gratitudeEntriesTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(gratitudeEntriesTable.id, id), eq(gratitudeEntriesTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Entry not found" });
  return res.json(updated[0]);
});

router.delete("/gratitude/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  await db.delete(gratitudeEntriesTable).where(and(eq(gratitudeEntriesTable.id, id), eq(gratitudeEntriesTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
