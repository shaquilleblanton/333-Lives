import { Router } from "express";
import { getUserId, requireOwner } from "../middlewares/auth";
import { db } from "@workspace/db";
import { peopleTable, insertPersonSchema, updatePersonSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
const router = Router();

router.get("/people", async (req, res) => {
  const rows = await db.select().from(peopleTable).where(eq(peopleTable.userId, getUserId(req)));
  return res.json(rows.sort((a, b) => a.name.localeCompare(b.name)));
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

  // Strip circle-linking fields on create — same IDOR risk as PUT.
  // Only the app owner may set linkedUserId/isCircle via PATCH /:id/circle-link.
  const { linkedUserId: _l, isCircle: _c, ...safeData } = parsed.data;

  const inserted = await db.insert(peopleTable).values(safeData).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/people/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updatePersonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  // Strip circle-linking fields — only the app owner may set these (see PATCH /:id/circle-link).
  // Allowing any user to set linkedUserId would let them unilaterally include another account
  // in their Pulse circle and read that person's private posts (IDOR risk).
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
// This is the sole authorized path for setting linkedUserId/isCircle. The owner controls which family
// members can see each other's Pulse posts.
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

  // Verify the person exists (owner manages circles across all users)
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
