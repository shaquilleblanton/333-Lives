import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { intentionsTable, insertIntentionSchema, updateIntentionSchema, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayDate } from "../lib/date";

const router = Router();

router.get("/intentions", async (req, res) => {
  const date = (req.query.date as string) || getTodayDate(req);
  const rows = await db.select().from(intentionsTable).where(and(eq(intentionsTable.userId, getUserId(req)), eq(intentionsTable.date, date)));
  return res.json(rows);
});

// Streak history: longest-ever run and every fully-completed 333 day.
router.get("/intentions/history", async (req, res) => {
  const today = getTodayDate(req);
  const all = await db.select().from(intentionsTable).where(eq(intentionsTable.userId, getUserId(req)));

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

  // Fetch current celebration state for this user.
  const userId = getUserId(req);
  const [userRow] = await db
    .select({ celebrationLastRecord: usersTable.celebrationLastRecord, celebrationLastMilestone: usersTable.celebrationLastMilestone })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  let celebrationLastRecord = userRow?.celebrationLastRecord ?? null;
  let celebrationLastMilestone = userRow?.celebrationLastMilestone ?? null;

  // Auto-seed for existing users who have never had server-side celebration state.
  // This prevents a burst of celebrations for milestones already passed.
  if (celebrationLastRecord === null || celebrationLastMilestone === null) {
    const seededRecord = longestStreak;
    // Seed from longestStreak (historical best), not currentStreak.
    // A user who once hit 100 days but is currently at day 5 should not
    // re-trigger the 7 or 30-day celebrations they already saw.
    const seededMilestone = [7, 30, 100, 365].reduce((acc: number, m) => (longestStreak >= m ? m : acc), 0);
    await db
      .update(usersTable)
      .set({ celebrationLastRecord: seededRecord, celebrationLastMilestone: seededMilestone })
      .where(eq(usersTable.id, userId));
    celebrationLastRecord = seededRecord;
    celebrationLastMilestone = seededMilestone;
  }

  return res.json({ currentStreak, longestStreak, completedDays, celebrationLastRecord, celebrationLastMilestone });
});

/**
 * POST /intentions/celebrate
 *
 * Atomically claims any pending streak celebration for this user.
 * Decision logic runs inside a serializable transaction with a row-level
 * FOR UPDATE lock so concurrent requests from multiple devices can never
 * both claim the same celebration.
 *
 * Returns { kind, value? } where kind is one of:
 *   "baseline"  — first time we've seen this user; state seeded, no animation
 *   "record"    — new personal-best streak; value = the new record
 *   "milestone" — crossed a round-number threshold; value = the milestone
 *   "none"      — nothing new to celebrate
 */
const CELEBRATION_MILESTONES = [7, 30, 100, 365] as const;
const highestMilestoneReached = (streak: number): number =>
  CELEBRATION_MILESTONES.reduce((acc, m) => (streak >= m ? m : acc), 0);

router.post("/intentions/celebrate", async (req, res) => {
  const userId = getUserId(req);
  const today = getTodayDate(req);

  // Compute current streak (same logic as GET /intentions/history).
  const all = await db.select().from(intentionsTable).where(eq(intentionsTable.userId, userId));

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

  const completedDays = [...byDate.keys()].filter(isDayComplete).sort();
  const dayMs = 86400000;
  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of completedDays) {
    const t = new Date(d + "T00:00:00.000Z").getTime();
    if (prev !== null && t - prev === dayMs) run += 1;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = t;
  }
  const ymd = (dt: Date) => dt.toISOString().split("T")[0];
  let currentStreak = 0;
  const cursor = new Date(today + "T00:00:00.000Z");
  if (!isDayComplete(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (isDayComplete(ymd(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Atomically decide and claim inside a transaction with a row-level lock.
  // FOR UPDATE ensures only one concurrent request advances the state.
  let kind: "baseline" | "record" | "milestone" | "none" = "none";
  let value: number | undefined;

  await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ celebrationLastRecord: usersTable.celebrationLastRecord, celebrationLastMilestone: usersTable.celebrationLastMilestone })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");

    const lastRecord = user?.celebrationLastRecord ?? null;
    const lastMilestone = user?.celebrationLastMilestone ?? null;

    // Baseline seeding: first time server has seen this user.
    // Seed from longestStreak so existing milestones don't re-fire.
    if (lastRecord === null || lastMilestone === null) {
      await tx
        .update(usersTable)
        .set({
          celebrationLastRecord: longestStreak,
          celebrationLastMilestone: highestMilestoneReached(longestStreak),
        })
        .where(eq(usersTable.id, userId));
      kind = "baseline";
      return;
    }

    const isRecordRun = currentStreak > 0 && currentStreak === longestStreak;
    const isNewRecord = isRecordRun && currentStreak > lastRecord;
    const crossedMilestone = highestMilestoneReached(currentStreak);
    const isNewMilestone = crossedMilestone > lastMilestone;

    if (isNewRecord) {
      // Record wins when both fire on the same day; also advance milestone silently.
      await tx
        .update(usersTable)
        .set({
          celebrationLastRecord: currentStreak,
          celebrationLastMilestone: isNewMilestone ? crossedMilestone : lastMilestone,
        })
        .where(eq(usersTable.id, userId));
      kind = "record";
      value = currentStreak;
    } else if (isNewMilestone) {
      await tx
        .update(usersTable)
        .set({ celebrationLastMilestone: crossedMilestone })
        .where(eq(usersTable.id, userId));
      kind = "milestone";
      value = crossedMilestone;
    }
    // else kind stays "none", no write needed
  });

  return res.json({ kind, ...(value !== undefined ? { value } : {}) });
});

router.post("/intentions", async (req, res) => {
  const date = req.body.date || getTodayDate(req);
  const parsed = insertIntentionSchema.safeParse({ ...req.body, userId: getUserId(req), date });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(intentionsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/intentions/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const parsed = updateIntentionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(intentionsTable).set(parsed.data).where(and(eq(intentionsTable.id, id), eq(intentionsTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Intention not found" });
  return res.json(updated[0]);
});

router.delete("/intentions/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const deleted = await db.delete(intentionsTable).where(and(eq(intentionsTable.id, id), eq(intentionsTable.userId, getUserId(req)))).returning();
  if (deleted.length === 0) return res.status(404).json({ error: "Intention not found" });
  return res.status(204).send();
});

export default router;
