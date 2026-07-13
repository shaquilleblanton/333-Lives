import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  intentionsTable,
  habitCheckinsTable,
  habitsTable,
  gratitudeEntriesTable,
  goalsTable,
  lifeEventsTable,
  legacyLettersTable,
  messagesTable,
  vaultItemsTable,
  relationshipMomentsTable,
  peopleTable,
  journalEntriesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";

const router = Router();

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","is","it",
  "i","my","me","was","are","be","been","have","has","that","this","they","we","you",
  "he","she","so","do","did","not","as","by","from","about","had","what","when","who",
  "will","would","could","should","just","like","more","also","up","all","out","there",
  "their","one","can","no","if","than","then","its","our","your","him","her","his",
  "them","any","very","how","feel","felt","today","day","time","know","want","think",
  "going","make","been","some","year","really","even","back","still","here","good",
]);

router.get("/review/:year", async (req, res) => {
  const userId = getUserId(req);
  const year = parseInt(req.params.year, 10);

  if (isNaN(year) || year < 2020 || year > 2100) {
    return res.status(400).json({ error: "Invalid year" });
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [
    intentionDates,
    gratitudeDates,
    habitCheckinDates,
    completedIntentionsResult,
    completedDates,
    gratitudeCountResult,
    habitCheckinCountResult,
    goalsCompletedResult,
    lifeEventsResult,
    lettersResult,
    messagesResult,
    vaultResult,
    momentsByPerson,
    totalMomentsResult,
    journalRows,
  ] = await Promise.all([
    db.selectDistinct({ date: intentionsTable.date })
      .from(intentionsTable)
      .where(and(eq(intentionsTable.userId, userId), gte(intentionsTable.date, yearStart), lte(intentionsTable.date, yearEnd))),

    db.selectDistinct({ date: gratitudeEntriesTable.date })
      .from(gratitudeEntriesTable)
      .where(and(eq(gratitudeEntriesTable.userId, userId), gte(gratitudeEntriesTable.date, yearStart), lte(gratitudeEntriesTable.date, yearEnd))),

    db.selectDistinct({ date: habitCheckinsTable.date })
      .from(habitCheckinsTable)
      .innerJoin(habitsTable, eq(habitCheckinsTable.habitId, habitsTable.id))
      .where(and(eq(habitsTable.userId, userId), gte(habitCheckinsTable.date, yearStart), lte(habitCheckinsTable.date, yearEnd))),

    db.select({ total: count() })
      .from(intentionsTable)
      .where(and(eq(intentionsTable.userId, userId), eq(intentionsTable.isCompleted, true), gte(intentionsTable.date, yearStart), lte(intentionsTable.date, yearEnd))),

    db.selectDistinct({ date: intentionsTable.date })
      .from(intentionsTable)
      .where(and(eq(intentionsTable.userId, userId), eq(intentionsTable.isCompleted, true), gte(intentionsTable.date, yearStart), lte(intentionsTable.date, yearEnd))),

    db.select({ total: count() })
      .from(gratitudeEntriesTable)
      .where(and(eq(gratitudeEntriesTable.userId, userId), gte(gratitudeEntriesTable.date, yearStart), lte(gratitudeEntriesTable.date, yearEnd))),

    db.select({ total: count() })
      .from(habitCheckinsTable)
      .innerJoin(habitsTable, eq(habitCheckinsTable.habitId, habitsTable.id))
      .where(and(eq(habitsTable.userId, userId), gte(habitCheckinsTable.date, yearStart), lte(habitCheckinsTable.date, yearEnd))),

    db.select({ total: count() })
      .from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isCompleted, true), sql`EXTRACT(YEAR FROM ${goalsTable.createdAt}) = ${year}`)),

    db.select({ total: count() })
      .from(lifeEventsTable)
      .where(and(eq(lifeEventsTable.userId, userId), sql`EXTRACT(YEAR FROM ${lifeEventsTable.createdAt}) = ${year}`)),

    db.select({ total: count() })
      .from(legacyLettersTable)
      .where(and(eq(legacyLettersTable.userId, userId), sql`EXTRACT(YEAR FROM ${legacyLettersTable.createdAt}) = ${year}`)),

    db.select({ total: count() })
      .from(messagesTable)
      .where(and(eq(messagesTable.userId, userId), sql`EXTRACT(YEAR FROM ${messagesTable.createdAt}) = ${year}`)),

    db.select({ total: count() })
      .from(vaultItemsTable)
      .where(and(eq(vaultItemsTable.userId, userId), sql`EXTRACT(YEAR FROM ${vaultItemsTable.createdAt}) = ${year}`)),

    db.select({ personId: relationshipMomentsTable.personId, name: peopleTable.name, momentCount: count() })
      .from(relationshipMomentsTable)
      .innerJoin(peopleTable, eq(relationshipMomentsTable.personId, peopleTable.id))
      .where(and(eq(peopleTable.userId, userId), gte(relationshipMomentsTable.date, yearStart), lte(relationshipMomentsTable.date, yearEnd)))
      .groupBy(relationshipMomentsTable.personId, peopleTable.name)
      .orderBy(desc(count()))
      .limit(3),

    db.select({ total: count() })
      .from(relationshipMomentsTable)
      .innerJoin(peopleTable, eq(relationshipMomentsTable.personId, peopleTable.id))
      .where(and(eq(peopleTable.userId, userId), gte(relationshipMomentsTable.date, yearStart), lte(relationshipMomentsTable.date, yearEnd))),

    db.select({ content: journalEntriesTable.content, mood: journalEntriesTable.mood })
      .from(journalEntriesTable)
      .where(and(eq(journalEntriesTable.userId, userId), sql`EXTRACT(YEAR FROM ${journalEntriesTable.createdAt}) = ${year}`)),
  ]);

  const allDates = new Set([
    ...intentionDates.map((r) => r.date),
    ...gratitudeDates.map((r) => r.date),
    ...habitCheckinDates.map((r) => r.date),
  ]);
  const daysActive = allDates.size;

  const sortedDates = completedDates.map((r) => r.date).sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let prevMs: number | null = null;
  for (const dateStr of sortedDates) {
    const ms = new Date(dateStr).getTime();
    if (prevMs !== null) {
      const diff = Math.round((ms - prevMs) / 86400000);
      if (diff === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    prevMs = ms;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  const moodBreakdown: Record<string, number> = {};
  const wordCounts: Record<string, number> = {};
  for (const entry of journalRows) {
    moodBreakdown[entry.mood] = (moodBreakdown[entry.mood] ?? 0) + 1;
    const words = entry.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words) {
      wordCounts[w] = (wordCounts[w] ?? 0) + 1;
    }
  }
  const topWord = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return res.json({
    year,
    numbers: {
      daysActive,
      intentionsCompleted: Number(completedIntentionsResult[0]?.total ?? 0),
      longestStreak,
      gratitudeEntries: Number(gratitudeCountResult[0]?.total ?? 0),
      habitCheckins: Number(habitCheckinCountResult[0]?.total ?? 0),
      goalsCompleted: Number(goalsCompletedResult[0]?.total ?? 0),
    },
    story: {
      lifeEventsAdded: Number(lifeEventsResult[0]?.total ?? 0),
      lettersWritten: Number(lettersResult[0]?.total ?? 0),
      futureMessagesSet: Number(messagesResult[0]?.total ?? 0),
      vaultItemsAdded: Number(vaultResult[0]?.total ?? 0),
    },
    people: {
      totalMoments: Number(totalMomentsResult[0]?.total ?? 0),
      topPeople: momentsByPerson.map((p) => ({
        personId: p.personId,
        name: p.name,
        momentCount: Number(p.momentCount),
      })),
    },
    growth: {
      journalEntries: journalRows.length,
      moodBreakdown,
    },
    topWord,
  });
});

export default router;
