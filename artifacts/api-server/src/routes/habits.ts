import { Router } from "express";
import { db } from "@workspace/db";
import { habitsTable, habitCheckinsTable, insertHabitSchema, updateHabitSchema, insertHabitCheckinSchema } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

async function buildHabitResponse(habit: typeof habitsTable.$inferSelect) {
  const today = getTodayDate();
  const checkins = await db.select().from(habitCheckinsTable).where(eq(habitCheckinsTable.habitId, habit.id));
  const totalCheckins = checkins.length;
  const checkedInToday = checkins.some((c) => c.date === today);
  const completionRate = habit.targetDays > 0 ? Math.min(100, Math.round((totalCheckins / habit.targetDays) * 100)) : 0;
  return { ...habit, checkedInToday, completionRate, totalCheckins };
}

router.get("/habits", async (req, res) => {
  const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, DEFAULT_USER_ID));
  const result = await Promise.all(habits.map(buildHabitResponse));
  return res.json(result);
});

router.post("/habits", async (req, res) => {
  const parsed = insertHabitSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(habitsTable).values(parsed.data).returning();
  const habit = await buildHabitResponse(inserted[0]);
  return res.status(201).json(habit);
});

router.put("/habits/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateHabitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(habitsTable).set(parsed.data).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, DEFAULT_USER_ID))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Habit not found" });
  const habit = await buildHabitResponse(updated[0]);
  return res.json(habit);
});

router.delete("/habits/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

router.post("/habits/:id/checkin", async (req, res) => {
  const habitId = Number(req.params.id);
  const today = getTodayDate();

  const existing = await db.select().from(habitCheckinsTable).where(and(eq(habitCheckinsTable.habitId, habitId), eq(habitCheckinsTable.date, today))).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Already checked in today" });

  const parsed = insertHabitCheckinSchema.safeParse({ ...req.body, habitId, date: today });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const inserted = await db.insert(habitCheckinsTable).values(parsed.data).returning();

  const checkins = await db.select().from(habitCheckinsTable).where(eq(habitCheckinsTable.habitId, habitId));
  const newStreak = checkins.length;
  const habit = await db.select().from(habitsTable).where(eq(habitsTable.id, habitId)).limit(1);
  if (habit.length > 0) {
    const longestStreak = Math.max(habit[0].longestStreak, newStreak);
    await db.update(habitsTable).set({ currentStreak: newStreak, longestStreak, totalCheckins: newStreak }).where(eq(habitsTable.id, habitId));
  }

  return res.json(inserted[0]);
});

export default router;
