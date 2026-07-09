import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  workoutSessionsTable,
  workoutBlocksTable,
  insertWorkoutSessionSchema,
  updateWorkoutSessionSchema,
  insertWorkoutBlockSchema,
  updateWorkoutBlockSchema,
} from "@workspace/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

const router = Router();

async function sessionWithBlocks(id: number, userId: number) {
  const rows = await db
    .select()
    .from(workoutSessionsTable)
    .where(and(eq(workoutSessionsTable.id, id), eq(workoutSessionsTable.userId, userId)))
    .limit(1);
  if (rows.length === 0) return null;
  const blocks = await db
    .select()
    .from(workoutBlocksTable)
    .where(eq(workoutBlocksTable.sessionId, id))
    .orderBy(asc(workoutBlocksTable.position));
  return { ...rows[0], blocks };
}

router.get("/workouts", async (req, res) => {
  const { start, end } = req.query as Record<string, string>;
  const conditions = [eq(workoutSessionsTable.userId, getUserId(req))];
  if (start) conditions.push(gte(workoutSessionsTable.date, start));
  if (end) conditions.push(lte(workoutSessionsTable.date, end));
  const sessions = await db
    .select()
    .from(workoutSessionsTable)
    .where(and(...conditions))
    .orderBy(asc(workoutSessionsTable.date), asc(workoutSessionsTable.position));

  if (sessions.length === 0) return res.json([]);

  const blocks = await db.select().from(workoutBlocksTable);
  const bySession = new Map<number, typeof blocks>();
  for (const b of blocks) {
    const arr = bySession.get(b.sessionId) || [];
    arr.push(b);
    bySession.set(b.sessionId, arr);
  }
  const result = sessions.map((s) => ({
    ...s,
    blocks: (bySession.get(s.id) || []).sort((a, b) => a.position - b.position),
  }));
  return res.json(result);
});

router.get("/workouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const session = await sessionWithBlocks(id, getUserId(req));
  if (!session) return res.status(404).json({ error: "Workout not found" });
  return res.json(session);
});

router.post("/workouts", async (req, res) => {
  const parsed = insertWorkoutSessionSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(workoutSessionsTable).values(parsed.data).returning();
  const session = await sessionWithBlocks(inserted[0].id, getUserId(req));
  return res.status(201).json(session);
});

router.put("/workouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateWorkoutSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(workoutSessionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workoutSessionsTable.id, id), eq(workoutSessionsTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Workout not found" });
  const session = await sessionWithBlocks(id, getUserId(req));
  return res.json(session);
});

router.delete("/workouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(workoutSessionsTable)
    .where(and(eq(workoutSessionsTable.id, id), eq(workoutSessionsTable.userId, getUserId(req))))
    .returning();
  if (deleted.length === 0) return res.status(404).json({ error: "Workout not found" });
  return res.json({ success: true });
});

// --- Blocks ---

router.post("/workouts/:id/blocks", async (req, res) => {
  const id = Number(req.params.id);
  const owner = await sessionWithBlocks(id, getUserId(req));
  if (!owner) return res.status(404).json({ error: "Workout not found" });
  const nextPos = owner.blocks.length
    ? Math.max(...owner.blocks.map((b) => b.position)) + 1
    : 0;
  const parsed = insertWorkoutBlockSchema.safeParse({ ...req.body, sessionId: id, position: nextPos });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  await db.insert(workoutBlocksTable).values(parsed.data);
  const session = await sessionWithBlocks(id, getUserId(req));
  return res.status(201).json(session);
});

router.put("/workouts/:id/blocks/reorder", async (req, res) => {
  const id = Number(req.params.id);
  const owner = await sessionWithBlocks(id, getUserId(req));
  if (!owner) return res.status(404).json({ error: "Workout not found" });

  const blockIds: unknown = req.body?.blockIds;
  if (!Array.isArray(blockIds) || blockIds.some((x) => typeof x !== "number")) {
    return res.status(400).json({ error: "blockIds must be an array of block ids" });
  }
  const ownedIds = owner.blocks.map((b) => b.id);
  const unique = new Set(blockIds).size === blockIds.length;
  const isPermutation =
    blockIds.length === ownedIds.length && unique && blockIds.every((bid) => ownedIds.includes(bid as number));
  if (!isPermutation) {
    return res.status(400).json({ error: "blockIds must be a permutation of the session's block ids" });
  }

  await Promise.all(
    (blockIds as number[]).map((bid, idx) =>
      db.update(workoutBlocksTable).set({ position: idx }).where(eq(workoutBlocksTable.id, bid))
    )
  );
  const session = await sessionWithBlocks(id, getUserId(req));
  return res.json(session);
});

router.put("/workouts/:id/blocks/:blockId", async (req, res) => {
  const id = Number(req.params.id);
  const blockId = Number(req.params.blockId);
  const owner = await sessionWithBlocks(id, getUserId(req));
  if (!owner) return res.status(404).json({ error: "Workout not found" });
  if (!owner.blocks.some((b) => b.id === blockId)) return res.status(404).json({ error: "Block not found" });
  const parsed = updateWorkoutBlockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  await db.update(workoutBlocksTable).set(parsed.data).where(eq(workoutBlocksTable.id, blockId));
  const session = await sessionWithBlocks(id, getUserId(req));
  return res.json(session);
});

router.delete("/workouts/:id/blocks/:blockId", async (req, res) => {
  const id = Number(req.params.id);
  const blockId = Number(req.params.blockId);
  const owner = await sessionWithBlocks(id, getUserId(req));
  if (!owner) return res.status(404).json({ error: "Workout not found" });
  if (!owner.blocks.some((b) => b.id === blockId)) return res.status(404).json({ error: "Block not found" });
  await db.delete(workoutBlocksTable).where(eq(workoutBlocksTable.id, blockId));
  const session = await sessionWithBlocks(id, getUserId(req));
  return res.json(session);
});

export default router;
