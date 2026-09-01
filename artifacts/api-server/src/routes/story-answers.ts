import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { storyAnswersTable, upsertStoryAnswerSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

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

  const audioUrl = parsed.data.audioUrl;
  if (audioUrl) {
    try {
      parsed.data.audioUrl = await objectStorageService.associateObjectEntity(audioUrl, getUserId(req));
    } catch (err) {
      req.log.error({ err }, "Story audio ACL set failed");
      return res.status(400).json({ error: "Uploaded audio not found — please record again" });
    }
  }

  const previous = await db.select({ audioUrl: storyAnswersTable.audioUrl }).from(storyAnswersTable).where(and(eq(storyAnswersTable.userId, getUserId(req)), eq(storyAnswersTable.chapterId, chapterId), eq(storyAnswersTable.promptId, promptId))).limit(1);
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
  if (previous[0]?.audioUrl && previous[0].audioUrl !== rows[0].audioUrl) objectStorageService.deleteObjectEntityFile(previous[0].audioUrl).catch((err) => req.log.warn({ err }, "Story audio cleanup failed"));
  return res.json(rows[0]);
});

router.delete("/story-answers/:chapterId/:promptId", async (req, res) => {
  const { chapterId, promptId } = req.params;
  const previous = await db.select({ audioUrl: storyAnswersTable.audioUrl }).from(storyAnswersTable).where(and(eq(storyAnswersTable.userId, getUserId(req)), eq(storyAnswersTable.chapterId, chapterId), eq(storyAnswersTable.promptId, promptId))).limit(1);
  await db
    .delete(storyAnswersTable)
    .where(
      and(
        eq(storyAnswersTable.userId, getUserId(req)),
        eq(storyAnswersTable.chapterId, chapterId),
        eq(storyAnswersTable.promptId, promptId),
      ),
    );
  if (previous[0]?.audioUrl) objectStorageService.deleteObjectEntityFile(previous[0].audioUrl).catch((err) => req.log.warn({ err }, "Story audio cleanup failed"));
  return res.json({ success: true });
});

export default router;
