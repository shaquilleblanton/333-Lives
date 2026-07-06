import { Router } from "express";
import { db } from "@workspace/db";
import { intentionsTable, insertIntentionSchema, updateIntentionSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayDate } from "../lib/date";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/intentions", async (req, res) => {
  const date = (req.query.date as string) || getTodayDate(req);
  const rows = await db.select().from(intentionsTable).where(and(eq(intentionsTable.userId, DEFAULT_USER_ID), eq(intentionsTable.date, date)));
  return res.json(rows);
});

router.post("/intentions", async (req, res) => {
  const date = req.body.date || getTodayDate(req);
  const parsed = insertIntentionSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID, date });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(intentionsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/intentions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateIntentionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(intentionsTable).set(parsed.data).where(and(eq(intentionsTable.id, id), eq(intentionsTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Intention not found" });
  return res.json(updated[0]);
});

router.delete("/intentions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db.delete(intentionsTable).where(and(eq(intentionsTable.id, id), eq(intentionsTable.userId, DEFAULT_USER_ID))).returning();
  if (deleted.length === 0) return res.status(404).json({ error: "Intention not found" });
  return res.status(204).send();
});

export default router;
