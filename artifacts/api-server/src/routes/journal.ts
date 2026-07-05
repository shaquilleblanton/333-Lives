import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntriesTable, insertJournalEntrySchema, updateJournalEntrySchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

router.get("/journal", async (req, res) => {
  const rows = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.userId, DEFAULT_USER_ID));
  return res.json(rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

router.get("/journal/today", async (req, res) => {
  const today = getTodayDate();
  const rows = await db.select().from(journalEntriesTable).where(and(eq(journalEntriesTable.userId, DEFAULT_USER_ID), eq(journalEntriesTable.date, today))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "No journal entry for today" });
  return res.json(rows[0]);
});

router.post("/journal", async (req, res) => {
  const date = req.body.date || getTodayDate();
  const parsed = insertJournalEntrySchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID, date });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(journalEntriesTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/journal/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateJournalEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(journalEntriesTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(journalEntriesTable.id, id), eq(journalEntriesTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Entry not found" });
  return res.json(updated[0]);
});

router.delete("/journal/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(journalEntriesTable).where(and(eq(journalEntriesTable.id, id), eq(journalEntriesTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
