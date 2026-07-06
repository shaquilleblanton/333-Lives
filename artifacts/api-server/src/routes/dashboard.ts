import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, messagesTable, vaultItemsTable, habitsTable, habitCheckinsTable, eventsTable, intentionsTable } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getTodayDate } from "../lib/date";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/dashboard", async (req, res) => {
  const today = getTodayDate(req);
  const now = new Date();
  const startOfDay = new Date(today + "T00:00:00.000Z");
  const endOfDay = new Date(today + "T23:59:59.999Z");

  const [users, messages, vaultItems, habits, events, intentions] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1),
    db.select().from(messagesTable).where(eq(messagesTable.userId, DEFAULT_USER_ID)),
    db.select().from(vaultItemsTable).where(eq(vaultItemsTable.userId, DEFAULT_USER_ID)),
    db.select().from(habitsTable).where(eq(habitsTable.userId, DEFAULT_USER_ID)),
    db.select().from(eventsTable).where(and(eq(eventsTable.userId, DEFAULT_USER_ID), gte(eventsTable.startTime, startOfDay), lte(eventsTable.startTime, endOfDay))),
    db.select().from(intentionsTable).where(and(eq(intentionsTable.userId, DEFAULT_USER_ID), eq(intentionsTable.date, today))),
  ]);

  const user = users[0] || { name: "User", streakDays: 0, messagesSent: 0, goalsActive: 0 };

  const habitIds = habits.map((h) => h.id);
  const allCheckins = habitIds.length > 0
    ? await db.select().from(habitCheckinsTable).where(and(
        eq(habitCheckinsTable.date, today),
      ))
    : [];

  const todayHabits = habits.map((h) => {
    const checkedInToday = allCheckins.some((c) => c.habitId === h.id);
    const completionRate = h.targetDays > 0 ? Math.min(100, Math.round((h.totalCheckins / h.targetDays) * 100)) : 0;
    return { ...h, checkedInToday, completionRate };
  });

  const upcomingMessages = messages
    .map((m) => ({ ...m, isUnlocked: new Date(m.unlockDate) <= now }))
    .filter((m) => !m.isUnlocked)
    .sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())
    .slice(0, 5);

  const habitCompletionToday = todayHabits.filter((h) => h.checkedInToday).length;

  // Intentions streak: consecutive days (ending today or yesterday) where the
  // full 333 set (all three intentions) was set and every one completed.
  const allIntentions = await db
    .select()
    .from(intentionsTable)
    .where(eq(intentionsTable.userId, DEFAULT_USER_ID));

  const intentionsByDate = new Map<string, { total: number; completed: number }>();
  for (const i of allIntentions) {
    const entry = intentionsByDate.get(i.date) || { total: 0, completed: 0 };
    entry.total += 1;
    if (i.isCompleted) entry.completed += 1;
    intentionsByDate.set(i.date, entry);
  }

  const isDayComplete = (d: string) => {
    const e = intentionsByDate.get(d);
    return !!e && e.total >= 3 && e.completed === e.total;
  };

  const ymd = (dt: Date) => dt.toISOString().split("T")[0];
  let intentionsStreak = 0;
  const cursor = new Date(today + "T00:00:00.000Z");
  // If today isn't fully complete yet, don't break the streak — start counting from yesterday.
  if (!isDayComplete(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (isDayComplete(ymd(cursor))) {
    intentionsStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return res.json({
    userName: user.name,
    streakDays: user.streakDays,
    messagesSent: user.messagesSent,
    goalsActive: user.goalsActive,
    todayIntentions: intentions,
    upcomingMessages,
    todayHabits,
    todayEvents: events,
    vaultCount: vaultItems.length,
    habitCompletionToday,
    intentionsStreak,
  });
});

export default router;
