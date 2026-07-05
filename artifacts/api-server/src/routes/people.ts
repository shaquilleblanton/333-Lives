import { Router } from "express";
import { db } from "@workspace/db";
import { peopleTable, insertPersonSchema, updatePersonSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/people", async (req, res) => {
  const rows = await db.select().from(peopleTable).where(eq(peopleTable.userId, DEFAULT_USER_ID));
  return res.json(rows.sort((a, b) => a.name.localeCompare(b.name)));
});

router.get("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(peopleTable).where(and(eq(peopleTable.id, id), eq(peopleTable.userId, DEFAULT_USER_ID))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Person not found" });
  return res.json(rows[0]);
});

router.post("/people", async (req, res) => {
  const parsed = insertPersonSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(peopleTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updatePersonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(peopleTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(peopleTable.id, id), eq(peopleTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Person not found" });
  return res.json(updated[0]);
});

router.delete("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(peopleTable).where(and(eq(peopleTable.id, id), eq(peopleTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
