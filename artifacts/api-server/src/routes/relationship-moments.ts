import { Router } from "express";
import { db } from "@workspace/db";
import {
  relationshipMomentsTable,
  insertRelationshipMomentSchema,
  updateRelationshipMomentSchema,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/people/:personId/moments", async (req, res) => {
  const personId = Number(req.params.personId);
  const rows = await db
    .select()
    .from(relationshipMomentsTable)
    .where(
      and(
        eq(relationshipMomentsTable.userId, DEFAULT_USER_ID),
        eq(relationshipMomentsTable.personId, personId)
      )
    )
    .orderBy(desc(relationshipMomentsTable.date));
  return res.json(rows);
});

router.post("/people/:personId/moments", async (req, res) => {
  const personId = Number(req.params.personId);
  const parsed = insertRelationshipMomentSchema.safeParse({
    ...req.body,
    userId: DEFAULT_USER_ID,
    personId,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(relationshipMomentsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/people/:personId/moments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateRelationshipMomentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(relationshipMomentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(relationshipMomentsTable.id, id),
        eq(relationshipMomentsTable.userId, DEFAULT_USER_ID)
      )
    )
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Moment not found" });
  return res.json(updated[0]);
});

router.delete("/people/:personId/moments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(relationshipMomentsTable)
    .where(
      and(
        eq(relationshipMomentsTable.id, id),
        eq(relationshipMomentsTable.userId, DEFAULT_USER_ID)
      )
    );
  return res.json({ success: true });
});

export default router;
