import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { tasksTable, insertTaskSchema, updateTaskSchema } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

router.get("/tasks", async (req, res) => {
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, getUserId(req)))
    .orderBy(asc(tasksTable.dueDate), asc(tasksTable.createdAt));
  return res.json(rows);
});

router.post("/tasks", async (req, res) => {
  const parsed = insertTaskSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(tasksTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { isCompleted, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if (typeof isCompleted === "boolean") {
    patch.isCompleted = isCompleted;
    patch.completedAt = isCompleted ? new Date() : null;
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const updated = await db
    .update(tasksTable)
    .set(patch)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Task not found" });
  return res.json(updated[0]);
});

router.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, getUserId(req))))
    .returning();
  if (deleted.length === 0) return res.status(404).json({ error: "Task not found" });
  return res.json({ success: true });
});

export default router;
