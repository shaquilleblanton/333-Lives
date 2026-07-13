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
    if (!audioUrl.startsWith("/objects/")) {
      return res.status(400).json({ error: "audioUrl must be a valid object path" });
    }
    try {
      await objectStorageService.trySetObjectEntityAclPolicy(audioUrl, {
        owner: String(getUserId(req)),
        visibility: "private",
      });
    } catch (err) {
      req.log.error({ err }, "Story audio ACL set failed");
      return res.status(400).json({ error: "Uploaded audio not found — please record again" });
    }
  }

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
