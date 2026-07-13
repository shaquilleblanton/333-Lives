import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { storyAnswersTable, upsertStoryAnswerSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/story-answers", async (req, res) => {
  const rows = await db
    .select()
    .from(storyAnswersTable)
    .where(eq(storyAnswersTable.userId, getUserId(req)));
  return res.json(rows);
});

router.put("/story-answers/:chapterId/:promptId", async (req, res) => {
  const { chapterId, promptId } = req.params;
  const parsed = upsertStoryAnswerSchema.safeParse({
    ...req.body,
    userId: getUserId(req),
    chapterId,
    promptId,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const rows = await db
    .insert(storyAnswersTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: [storyAnswersTable.userId, storyAnswersTable.chapterId, storyAnswersTable.promptId],
      set: {
        textAnswer: parsed.data.textAnswer ?? null,
        audioUrl: parsed.data.audioUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return res.json(rows[0]);
});

router.delete("/story-answers/:chapterId/:promptId", async (req, res) => {
  const { chapterId, promptId } = req.params;
  await db
    .delete(storyAnswersTable)
    .where(
      and(
        eq(storyAnswersTable.userId, getUserId(req)),
        eq(storyAnswersTable.chapterId, chapterId),
        eq(storyAnswersTable.promptId, promptId),
      ),
    );
  return res.json({ success: true });
});

export default router;
