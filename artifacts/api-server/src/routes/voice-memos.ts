import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { voiceMemosTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

function present(memo: typeof voiceMemosTable.$inferSelect) {
  return {
    id: memo.id,
    title: memo.title,
    objectPath: memo.objectPath,
    durationSeconds: memo.durationSeconds,
    recordedAt: memo.recordedAt.toISOString(),
  };
}

router.get("/voice-memos", async (req, res) => {
  const memos = await db
    .select()
    .from(voiceMemosTable)
    .where(eq(voiceMemosTable.userId, getUserId(req)))
    .orderBy(desc(voiceMemosTable.recordedAt));
  return res.json(memos.map(present));
});

router.post("/voice-memos", async (req, res) => {
  const objectPath =
    typeof req.body?.objectPath === "string" ? req.body.objectPath.trim() : "";
  const titleRaw = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const durationRaw = req.body?.durationSeconds ?? 0;
  const durationSeconds = Number(durationRaw);

  if (!objectPath.startsWith("/objects/")) {
    return res.status(400).json({ error: "objectPath must be a valid object path" });
  }
  if (titleRaw.length > 200) {
    return res.status(400).json({ error: "title must be at most 200 characters" });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return res.status(400).json({ error: "durationSeconds must be a non-negative number" });
  }

  const recordedAt = new Date();
  const title =
    titleRaw ||
    `Memo — ${recordedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}, ${recordedAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

  // Mark the uploaded audio private, owned by the user, before recording
  // metadata. If the object doesn't exist the upload never finished — fail
  // loudly rather than saving a memo that can't play.
  try {
    await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: String(getUserId(req)),
      visibility: "private",
    });
  } catch (err) {
    req.log.error({ err }, "Voice memo ACL set failed");
    return res.status(400).json({ error: "Uploaded audio not found — please record again" });
  }

  const [memo] = await db
    .insert(voiceMemosTable)
    .values({
      userId: getUserId(req),
      title,
      objectPath,
      durationSeconds: Math.round(durationSeconds),
      recordedAt,
    })
    .returning();

  return res.status(201).json(present(memo));
});

router.patch("/voice-memos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 200) {
    return res.status(400).json({ error: "title is required (max 200 characters)" });
  }

  const [memo] = await db
    .update(voiceMemosTable)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(voiceMemosTable.id, id), eq(voiceMemosTable.userId, getUserId(req))))
    .returning();

  if (!memo) {
    return res.status(404).json({ error: "Voice memo not found" });
  }
  return res.json(present(memo));
});

router.delete("/voice-memos/:id", async (req, res) => {
  const id = Number(req.params.id);

  const [memo] = await db
    .delete(voiceMemosTable)
    .where(and(eq(voiceMemosTable.id, id), eq(voiceMemosTable.userId, getUserId(req))))
    .returning();

  if (!memo) {
    return res.status(404).json({ error: "Voice memo not found" });
  }

  // Best-effort cleanup of the stored audio; the DB row is already gone.
  try {
    const file = await objectStorageService.getObjectEntityFile(memo.objectPath);
    await file.delete();
  } catch (err) {
    if (!(err instanceof ObjectNotFoundError)) {
      req.log.warn({ err }, "Voice memo audio cleanup failed");
    }
  }

  return res.json({ success: true });
});

export default router;
