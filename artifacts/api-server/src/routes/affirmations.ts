import { Router } from "express";
import { db } from "@workspace/db";
import { affirmationsTable, insertAffirmationSchema, updateAffirmationSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

const DAILY_AFFIRMATIONS = [
  "I am becoming the person I needed when I was younger.",
  "I attract success, abundance, and positive energy.",
  "My past does not define my future — I am always growing.",
  "I am worthy of love, success, and everything I desire.",
  "Every day I am getting stronger, wiser, and more resilient.",
  "I choose peace, purpose, and progress over perfection.",
  "I am building something meaningful with every small action.",
  "My story is not over — the best chapters are still ahead.",
  "I am disciplined, focused, and committed to my vision.",
  "I protect my peace and pour into what matters most.",
];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

router.get("/affirmations", async (req, res) => {
  const rows = await db.select().from(affirmationsTable).where(eq(affirmationsTable.userId, DEFAULT_USER_ID));
  return res.json(rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

router.get("/affirmations/today", async (req, res) => {
  const today = getTodayDate();
  const existing = await db.select().from(affirmationsTable).where(and(eq(affirmationsTable.userId, DEFAULT_USER_ID), eq(affirmationsTable.date, today))).limit(1);
  if (existing.length > 0) return res.json(existing[0]);
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const text = DAILY_AFFIRMATIONS[dayOfYear % DAILY_AFFIRMATIONS.length];
  const inserted = await db.insert(affirmationsTable).values({ userId: DEFAULT_USER_ID, text, date: today }).returning();
  return res.json(inserted[0]);
});

router.post("/affirmations", async (req, res) => {
  const date = req.body.date || getTodayDate();
  const parsed = insertAffirmationSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID, date });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(affirmationsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/affirmations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateAffirmationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(affirmationsTable).set(parsed.data).where(and(eq(affirmationsTable.id, id), eq(affirmationsTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Affirmation not found" });
  return res.json(updated[0]);
});

export default router;
