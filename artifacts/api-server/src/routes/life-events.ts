import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  lifeEventsTable,
  createLifeEventSchema,
  updateLifeEventSchema,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

async function bindMediaAcl(
  mediaUrls: { objectPath: string }[],
  userId: string,
  log: typeof router.use extends (...args: any[]) => any ? any : never,
) {
  for (const media of mediaUrls) {
    await objectStorageService.trySetObjectEntityAclPolicy(media.objectPath, {
      owner: userId,
      visibility: "private",
    });
  }
}

router.get("/life-events", async (req, res) => {
  const rows = await db
    .select()
    .from(lifeEventsTable)
    .where(eq(lifeEventsTable.userId, getUserId(req)))
    .orderBy(desc(lifeEventsTable.date));
  return res.json(rows);
});

router.post("/life-events", async (req, res) => {
  const parsed = createLifeEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const media = parsed.data.mediaUrls ?? [];
  if (media.length > 0) {
    try {
      await bindMediaAcl(media, String(getUserId(req)), req.log);
    } catch (err) {
      req.log.error({ err }, "Life event media ACL set failed");
      return res.status(400).json({ error: "One or more media files not found — please re-upload" });
    }
  }

  const [row] = await db
    .insert(lifeEventsTable)
    .values({ ...parsed.data, userId: getUserId(req) })
    .returning();
  return res.status(201).json(row);
});

router.put("/life-events/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateLifeEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const media = parsed.data.mediaUrls ?? [];
  if (media.length > 0) {
    try {
      await bindMediaAcl(media, String(getUserId(req)), req.log);
    } catch (err) {
      req.log.error({ err }, "Life event media ACL set failed");
      return res.status(400).json({ error: "One or more media files not found — please re-upload" });
    }
  }

  const [row] = await db
    .update(lifeEventsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(lifeEventsTable.id, id), eq(lifeEventsTable.userId, getUserId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Life event not found" });
  return res.json(row);
});

router.delete("/life-events/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .delete(lifeEventsTable)
    .where(and(eq(lifeEventsTable.id, id), eq(lifeEventsTable.userId, getUserId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Life event not found" });
  return res.json({ success: true });
});

export default router;
