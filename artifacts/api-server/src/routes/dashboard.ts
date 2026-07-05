import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, messagesTable, vaultItemsTable, habitsTable, habitCheckinsTable, eventsTable, intentionsTable } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/dashboard", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
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
  });
});

export default router;
