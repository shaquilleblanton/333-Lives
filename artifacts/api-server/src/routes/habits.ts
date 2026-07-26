import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { habitsTable, habitCheckinsTable, insertHabitSchema, updateHabitSchema, insertHabitCheckinSchema } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Request } from "express";
import { getTodayDate } from "../lib/date";

const router = Router();

async function buildHabitResponse(habit: typeof habitsTable.$inferSelect, req: Request) {
  const today = getTodayDate(req);
  const checkins = await db.select().from(habitCheckinsTable).where(eq(habitCheckinsTable.habitId, habit.id));
  const totalCheckins = checkins.length;
  const checkedInToday = checkins.some((c) => c.date === today);
  const completionRate = habit.targetDays > 0 ? Math.min(100, Math.round((totalCheckins / habit.targetDays) * 100)) : 0;
  return { ...habit, checkedInToday, completionRate, totalCheckins };
}

router.get("/habits", async (req, res) => {
  const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, getUserId(req)));
  const result = await Promise.all(habits.map((h) => buildHabitResponse(h, req)));
  return res.json(result);
});

router.post("/habits", async (req, res) => {
  const parsed = insertHabitSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(habitsTable).values(parsed.data).returning();
  const habit = await buildHabitResponse(inserted[0], req);
  return res.status(201).json(habit);
});

router.put("/habits/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const parsed = updateHabitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(habitsTable).set(parsed.data).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Habit not found" });
  const habit = await buildHabitResponse(updated[0], req);
  return res.json(habit);
});

router.delete("/habits/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  await db.delete(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

router.post("/habits/:id/checkin", async (req, res) => {
  const habitId = parseIntParam(req.params.id, "id");
  const today = getTodayDate(req);

  const habit = await db.select().from(habitsTable).where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, getUserId(req)))).limit(1);
  if (habit.length === 0) return res.status(404).json({ error: "Habit not found" });

  const existing = await db.select().from(habitCheckinsTable).where(and(eq(habitCheckinsTable.habitId, habitId), eq(habitCheckinsTable.date, today))).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Already checked in today" });

  const parsed = insertHabitCheckinSchema.safeParse({ ...req.body, habitId, date: today });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const inserted = await db.insert(habitCheckinsTable).values(parsed.data).returning();

  const checkins = await db.select().from(habitCheckinsTable).where(eq(habitCheckinsTable.habitId, habitId));
  const newStreak = checkins.length;
  const longestStreak = Math.max(habit[0].longestStreak, newStreak);
  await db.update(habitsTable).set({ currentStreak: newStreak, longestStreak, totalCheckins: newStreak }).where(eq(habitsTable.id, habitId));

  return res.json(inserted[0]);
});

export default router;
