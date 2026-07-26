import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId, requireOwner } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  feedbackTable,
  usersTable,
  insertFeedbackSchema,
  updateFeedbackAdminSchema,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Strips the internal admin note from rows returned to regular users.
function presentOwn(row: typeof feedbackTable.$inferSelect) {
  const { adminNote, ...rest } = row;
  return rest;
}

router.get("/feedback", async (req, res) => {
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.userId, getUserId(req)))
    .orderBy(desc(feedbackTable.createdAt));
  return res.json(rows.map(presentOwn));
});

router.post("/feedback", async (req, res) => {
  const parsed = insertFeedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db
    .insert(feedbackTable)
    .values({ ...parsed.data, userId: getUserId(req) })
    .returning();
  return res.status(201).json(presentOwn(inserted[0]));
});

// --- Owner-only triage endpoints ---

router.get("/feedback/all", requireOwner, async (_req, res) => {
  const rows = await db
    .select({
      feedback: feedbackTable,
      submitterName: usersTable.name,
      submitterEmail: usersTable.email,
    })
    .from(feedbackTable)
    .innerJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
    .orderBy(desc(feedbackTable.createdAt));
  return res.json(
    rows.map((r) => ({
      ...r.feedback,
      submitterName: r.submitterName,
      submitterEmail: r.submitterEmail,
    })),
  );
});

router.patch("/feedback/:id", requireOwner, async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = updateFeedbackAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(feedbackTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(feedbackTable.id, id))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Feedback not found" });
  return res.json(updated[0]);
});

export default router;
