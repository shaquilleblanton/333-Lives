import { Router } from "express";
import { db } from "@workspace/db";
import { goalsTable, insertGoalSchema, updateGoalSchema, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/goals", async (req, res) => {
  const { category } = req.query;
  const rows = await db.select().from(goalsTable).where(eq(goalsTable.userId, DEFAULT_USER_ID));
  const result = rows.filter((g) => !category || g.category === category);
  return res.json(result);
});

router.post("/goals", async (req, res) => {
  const parsed = insertGoalSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(goalsTable).values(parsed.data).returning();
  const activeCount = await db.select().from(goalsTable).where(and(eq(goalsTable.userId, DEFAULT_USER_ID), eq(goalsTable.isCompleted, false)));
  await db.update(usersTable).set({ goalsActive: activeCount.length }).where(eq(usersTable.id, DEFAULT_USER_ID));
  return res.status(201).json(inserted[0]);
});

router.put("/goals/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(goalsTable).set(parsed.data).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Goal not found" });
  const activeCount = await db.select().from(goalsTable).where(and(eq(goalsTable.userId, DEFAULT_USER_ID), eq(goalsTable.isCompleted, false)));
  await db.update(usersTable).set({ goalsActive: activeCount.length }).where(eq(usersTable.id, DEFAULT_USER_ID));
  return res.json(updated[0]);
});

router.delete("/goals/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
