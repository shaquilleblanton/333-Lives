import { Router } from "express";
import { getUserId, requireOwner } from "../middlewares/auth";
import { db } from "@workspace/db";
import { peopleTable, insertPersonSchema, updatePersonSchema, relationshipMomentsTable } from "@workspace/db/schema";
import { eq, and, max, inArray } from "drizzle-orm";
import { getTodayDate } from "../lib/date";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Days until the next occurrence of an annual date (birthday/anniversary).
 * Compares month + day only (year-agnostic). Returns 0 if today, negative if
 * already passed this year and >365 hasn't been computed (we check next year).
 */
function daysUntilAnnual(dateStr: string, today: Date): number {
  const [, m, d] = dateStr.split("-").map(Number);
  const y = today.getFullYear();
  const thisYear = new Date(y, m - 1, d);
  const diff = Math.round((thisYear.getTime() - today.getTime()) / 86_400_000);
  if (diff >= 0) return diff;
  const nextYear = new Date(y + 1, m - 1, d);
  return Math.round((nextYear.getTime() - today.getTime()) / 86_400_000);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/people", async (req, res) => {
  const rows = await db.select().from(peopleTable).where(eq(peopleTable.userId, getUserId(req)));
  return res.json(rows.sort((a, b) => a.name.localeCompare(b.name)));
});

// GET /people/reminders — upcoming birthdays/anniversaries (next 7 days) and
// overdue connections (no logged moment within reconnectDays threshold).
// NOTE: must be registered BEFORE /people/:id to avoid "reminders" matching :id.
router.get("/people/reminders", async (req, res) => {
  const userId = getUserId(req);
  const todayStr = getTodayDate(req);
  const today = new Date(todayStr + "T00:00:00");

  const allPeople = await db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.userId, userId));

  // ── Upcoming events (next 7 days) ──────────────────────────────────────────
  const upcomingEvents: {
    personId: number;
    personName: string;
    type: "birthday" | "anniversary";
    label: string;
    daysUntil: number;
    date: string;
  }[] = [];

  for (const person of allPeople) {
    if (person.birthday) {
      const daysUntil = daysUntilAnnual(person.birthday, today);
      if (daysUntil >= 0 && daysUntil <= 7) {
        upcomingEvents.push({
          personId: person.id,
          personName: person.name,
          type: "birthday",
          label: `${person.name}'s Birthday`,
          daysUntil,
          date: person.birthday,
        });
      }
    }
    if (person.anniversary) {
      const daysUntil = daysUntilAnnual(person.anniversary, today);
      if (daysUntil >= 0 && daysUntil <= 7) {
        upcomingEvents.push({
          personId: person.id,
          personName: person.name,
          type: "anniversary",
          label: person.anniversaryLabel || `${person.name}'s Anniversary`,
          daysUntil,
          date: person.anniversary,
        });
      }
    }
  }
  upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil);

  // ── Overdue connections ────────────────────────────────────────────────────
  const overdueConnections: {
    personId: number;
    personName: string;
    reconnectDays: number;
    daysSinceLastMoment: number;
    lastMomentDate: string | null;
  }[] = [];

  const peopleWithReconnect = allPeople.filter(
    (p) => p.reconnectDays !== null && p.reconnectDays !== undefined,
  );

  if (peopleWithReconnect.length > 0) {
    const personIds = peopleWithReconnect.map((p) => p.id);
    const latestMoments = await db
      .select({
        personId: relationshipMomentsTable.personId,
        lastDate: max(relationshipMomentsTable.date),
      })
      .from(relationshipMomentsTable)
      .where(
        and(
          eq(relationshipMomentsTable.userId, userId),
          inArray(relationshipMomentsTable.personId, personIds),
        ),
      )
      .groupBy(relationshipMomentsTable.personId);

    const lastMomentMap = new Map(latestMoments.map((m) => [m.personId, m.lastDate]));

    for (const person of peopleWithReconnect) {
      const lastDate = lastMomentMap.get(person.id) ?? null;
      let daysSince: number;
      if (lastDate) {
        const lastMomentDate = new Date(lastDate + "T00:00:00");
        daysSince = Math.round((today.getTime() - lastMomentDate.getTime()) / 86_400_000);
      } else {
        // No moments ever — measure from when the person was added
        daysSince = Math.round(
          (today.getTime() - new Date(person.createdAt).getTime()) / 86_400_000,
        );
      }
      if (daysSince >= person.reconnectDays!) {
        overdueConnections.push({
          personId: person.id,
          personName: person.name,
          reconnectDays: person.reconnectDays!,
          daysSinceLastMoment: daysSince,
          lastMomentDate: lastDate,
        });
      }
    }
    overdueConnections.sort((a, b) => b.daysSinceLastMoment - a.daysSinceLastMoment);
  }

  return res.json({ upcomingEvents, overdueConnections });
});

router.get("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(peopleTable).where(and(eq(peopleTable.id, id), eq(peopleTable.userId, getUserId(req)))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Person not found" });
  return res.json(rows[0]);
});

router.post("/people", async (req, res) => {
  const parsed = insertPersonSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  // Strip circle-linking fields on create — IDOR risk if non-owners could set these.
  // Only the app owner may set linkedUserId/isCircle via PATCH /:id/circle-link.
  const { linkedUserId: _l, isCircle: _c, ...safeData } = parsed.data;

  const inserted = await db.insert(peopleTable).values(safeData).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updatePersonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  // Strip circle-linking fields — only the app owner may set these (PATCH /:id/circle-link).
  const { linkedUserId: _l, isCircle: _c, ...safeData } = parsed.data;

  const updated = await db
    .update(peopleTable)
    .set({ ...safeData, updatedAt: new Date() })
    .where(and(eq(peopleTable.id, id), eq(peopleTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Person not found" });
  return res.json(updated[0]);
});

// PATCH /people/:id/circle-link — owner-only: link a Person to a user account and toggle circle membership.
router.patch("/people/:id/circle-link", requireOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const { linkedUserId, isCircle } = req.body as { linkedUserId?: number | null; isCircle?: boolean };

  if (linkedUserId !== undefined && linkedUserId !== null && !Number.isInteger(linkedUserId)) {
    return res.status(400).json({ error: "linkedUserId must be an integer or null" });
  }
  if (isCircle !== undefined && typeof isCircle !== "boolean") {
    return res.status(400).json({ error: "isCircle must be a boolean" });
  }

  const existing = await db.select({ id: peopleTable.id }).from(peopleTable).where(eq(peopleTable.id, id)).limit(1);
  if (existing.length === 0) return res.status(404).json({ error: "Person not found" });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (linkedUserId !== undefined) patch.linkedUserId = linkedUserId;
  if (isCircle !== undefined) patch.isCircle = isCircle;

  const updated = await db
    .update(peopleTable)
    .set(patch)
    .where(eq(peopleTable.id, id))
    .returning();

  return res.json(updated[0]);
});

router.delete("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(peopleTable).where(and(eq(peopleTable.id, id), eq(peopleTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
