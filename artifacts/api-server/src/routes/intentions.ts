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

// Streak history: longest-ever run and every fully-completed 333 day.
router.get("/intentions/history", async (req, res) => {
  const today = getTodayDate(req);
  const all = await db.select().from(intentionsTable).where(eq(intentionsTable.userId, DEFAULT_USER_ID));

  const byDate = new Map<string, { total: number; completed: number }>();
  for (const i of all) {
    const entry = byDate.get(i.date) || { total: 0, completed: 0 };
    entry.total += 1;
    if (i.isCompleted) entry.completed += 1;
    byDate.set(i.date, entry);
  }

  const isDayComplete = (d: string) => {
    const e = byDate.get(d);
    return !!e && e.total >= 3 && e.completed === e.total;
  };

  // Fully-completed 333 days, ascending.
  const completedDays = [...byDate.keys()].filter(isDayComplete).sort();

  // Longest run of consecutive calendar days among completed days.
  const dayMs = 86400000;
  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of completedDays) {
    const t = new Date(d + "T00:00:00.000Z").getTime();
    if (prev !== null && t - prev === dayMs) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = t;
  }

  // Current streak: consecutive completed days ending today (or yesterday if
  // today isn't finished yet), matching the dashboard's streak semantics.
  const ymd = (dt: Date) => dt.toISOString().split("T")[0];
  let currentStreak = 0;
  const cursor = new Date(today + "T00:00:00.000Z");
  if (!isDayComplete(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (isDayComplete(ymd(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return res.json({ currentStreak, longestStreak, completedDays });
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
