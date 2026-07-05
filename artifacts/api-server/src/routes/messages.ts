import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, insertMessageSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/messages", async (req, res) => {
  const { type } = req.query;
  let query = db.select().from(messagesTable).where(eq(messagesTable.userId, DEFAULT_USER_ID));
  const rows = await query;
  const now = new Date();
  const result = rows
    .filter((m) => !type || m.type === type)
    .map((m) => ({ ...m, isUnlocked: new Date(m.unlockDate) <= now }));
  return res.json(result);
});

router.post("/messages", async (req, res) => {
  const parsed = insertMessageSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(messagesTable).values(parsed.data).returning();
  const m = inserted[0];
  return res.status(201).json({ ...m, isUnlocked: new Date(m.unlockDate) <= new Date() });
});

router.get("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.userId, DEFAULT_USER_ID))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Message not found" });
  const m = rows[0];
  return res.json({ ...m, isUnlocked: new Date(m.unlockDate) <= new Date() });
});

router.delete("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
