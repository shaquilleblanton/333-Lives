import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  pulsePostsTable,
  pulseReactionsTable,
  pulseCircleMembersTable,
  insertPulsePostSchema,
  usersTable,
  PULSE_REACTION_TYPES,
  type PulseReactionType,
} from "@workspace/db/schema";
import { eq, and, or, gt, isNull, desc, inArray, sql } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorage = new ObjectStorageService();

type ReactionCounts = Record<"fire" | "pray" | "love" | "strength", number>;

function emptyReactions(): ReactionCounts {
  return { fire: 0, pray: 0, love: 0, strength: 0 };
}

/**
 * Resolve the set of user IDs whose posts are visible to `userId`.
 *
 * Design decision — circle table vs People table:
 * The `people` table stores freeform named contacts (no FK to `users`), so it
 * cannot be used for circle scoping without a separate linking step. Instead,
 * `pulse_circle_members` provides an explicit, auditable join table.
 *
 * In 333 Lives (a closed, invite-only family app) the circle intentionally
 * equals all authenticated users. The auth middleware auto-seeds bidirectional
 * rows whenever a new user is provisioned so existing users immediately see the
 * new member's posts. The empty-circle fallback below ensures existing users
 * who were provisioned before this feature is live still see all posts.
 */
async function resolveVisibleUserIds(userId: number): Promise<number[]> {
  const circleRows = await db
    .select({ memberUserId: pulseCircleMembersTable.memberUserId })
    .from(pulseCircleMembersTable)
    .where(eq(pulseCircleMembersTable.userId, userId));

  const circleUserIds = circleRows.map((r) => r.memberUserId);

  // Empty-circle fallback: if no circle members are configured yet (e.g. a
  // single-user install or an existing account before auto-seeding ran), treat
  // all authenticated users as the circle. This keeps the feature usable on
  // first launch without requiring an explicit admin seeding step.
  if (circleUserIds.length === 0) {
    const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
    return allUsers.map((u) => u.id);
  }

  return [...new Set([userId, ...circleUserIds])];
}

async function buildFeedResponse(
  posts: (typeof pulsePostsTable.$inferSelect)[],
  currentUserId: number,
  authorMap: Map<number, string>,
) {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const allReactions = await db
    .select()
    .from(pulseReactionsTable)
    .where(inArray(pulseReactionsTable.postId, postIds));

  const reactionsByPost = new Map<number, typeof allReactions>();
  for (const r of allReactions) {
    const arr = reactionsByPost.get(r.postId) ?? [];
    arr.push(r);
    reactionsByPost.set(r.postId, arr);
  }

  return posts.map((post) => {
    const reactions = reactionsByPost.get(post.id) ?? [];
    const counts = emptyReactions();
    for (const r of reactions) {
      if (r.type in counts) counts[r.type as keyof ReactionCounts]++;
    }
    const myReaction = reactions.find((r) => r.userId === currentUserId)?.type ?? null;
    const reactorNames = post.userId === currentUserId
      ? reactions.map((r) => ({
          userId: r.userId,
          type: r.type,
          name: authorMap.get(r.userId) ?? "Someone",
        }))
      : [];

    return {
      id: post.id,
      userId: post.userId,
      authorName: authorMap.get(post.userId) ?? "Unknown",
      isOwn: post.userId === currentUserId,
      content: post.content,
      mediaUrl: post.mediaUrl,
      type: post.type,
      isPersistent: post.isPersistent,
      expiresAt: post.expiresAt?.toISOString() ?? null,
      reactions: counts,
      myReaction,
      reactorNames,
      createdAt: post.createdAt.toISOString(),
    };
  });
}

/** Returns the post if it exists AND is visible to `userId`; null otherwise. */
async function findVisiblePost(
  postId: number,
  userId: number,
  now: Date,
): Promise<(typeof pulsePostsTable.$inferSelect) | null> {
  const visibleUserIds = await resolveVisibleUserIds(userId);
  const notExpired = or(
    eq(pulsePostsTable.isPersistent, true),
    gt(pulsePostsTable.expiresAt, now),
    isNull(pulsePostsTable.expiresAt),
  );
  const rows = await db
    .select()
    .from(pulsePostsTable)
    .where(
      and(
        eq(pulsePostsTable.id, postId),
        inArray(pulsePostsTable.userId, visibleUserIds),
        notExpired,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// GET /pulse/feed — posts from users in the current user's circle (+ own posts).
router.get("/pulse/feed", async (req, res) => {
  const currentUserId = getUserId(req);
  const now = new Date();

  const visibleUserIds = await resolveVisibleUserIds(currentUserId);

  const notExpired = or(
    eq(pulsePostsTable.isPersistent, true),
    gt(pulsePostsTable.expiresAt, now),
    isNull(pulsePostsTable.expiresAt),
  );

  const posts = await db
    .select()
    .from(pulsePostsTable)
    .where(and(notExpired, inArray(pulsePostsTable.userId, visibleUserIds)))
    .orderBy(desc(pulsePostsTable.createdAt))
    .limit(100);

  const allUserIds = [...new Set(posts.map((p) => p.userId))];
  let authorMap = new Map<number, string>();
  if (allUserIds.length > 0) {
    const authors = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, allUserIds));
    for (const a of authors) authorMap.set(a.id, a.name);
  }

  const result = await buildFeedResponse(posts, currentUserId, authorMap);
  return res.json(result);
});

// POST /pulse/posts — create a post
router.post("/pulse/posts", async (req, res) => {
  const parsed = insertPulsePostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { content, mediaUrl, type, isPersistent } = parsed.data;

  if (type === "text" && !content?.trim()) {
    return res.status(400).json({ error: "content is required for text posts" });
  }
  if ((type === "photo" || type === "voice") && !mediaUrl) {
    return res.status(400).json({ error: "mediaUrl is required for photo/voice posts" });
  }

  // ACL-bind the media object. Set visibility to "public" so all authenticated
  // family members can view it via /storage/objects/* (that route requires auth,
  // so "public" here means any signed-in user — not the open internet).
  if (mediaUrl) {
    try {
      await objectStorage.trySetObjectEntityAclPolicy(mediaUrl, {
        owner: String(getUserId(req)),
        visibility: "public",
      });
    } catch (err) {
      req.log.error({ err }, "Pulse post media ACL set failed");
      return res.status(400).json({ error: "Uploaded file not found — please re-upload" });
    }
  }

  const expiresAt = isPersistent ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [post] = await db
    .insert(pulsePostsTable)
    .values({
      userId: getUserId(req),
      content: content ?? null,
      mediaUrl: mediaUrl ?? null,
      type,
      isPersistent: isPersistent ?? false,
      expiresAt,
    })
    .returning();

  const authorRow = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, getUserId(req)))
    .limit(1);
  const authorName = authorRow[0]?.name ?? "Unknown";

  return res.status(201).json({
    id: post.id,
    userId: post.userId,
    authorName,
    isOwn: true,
    content: post.content,
    mediaUrl: post.mediaUrl,
    type: post.type,
    isPersistent: post.isPersistent,
    expiresAt: post.expiresAt?.toISOString() ?? null,
    reactions: emptyReactions(),
    myReaction: null,
    reactorNames: [],
    createdAt: post.createdAt.toISOString(),
  });
});

// DELETE /pulse/posts/:id — delete own post (ownership check is sufficient — no circle needed)
router.delete("/pulse/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(pulsePostsTable)
    .where(and(eq(pulsePostsTable.id, id), eq(pulsePostsTable.userId, getUserId(req))))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Post not found or not yours" });

  if (deleted.mediaUrl) {
    try {
      const file = await objectStorage.getObjectEntityFile(deleted.mediaUrl);
      await file.delete();
    } catch {
      // best-effort cleanup
    }
  }

  return res.json({ success: true });
});

// PUT /pulse/posts/:id/react — add or change reaction (one per user per post).
// Requires the post to be visible (i.e. in the requester's circle) before mutating.
router.put("/pulse/posts/:id/react", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const type = req.body?.type as string;
  if (!PULSE_REACTION_TYPES.includes(type as PulseReactionType)) {
    return res.status(400).json({ error: `type must be one of: ${PULSE_REACTION_TYPES.join(", ")}` });
  }

  const post = await findVisiblePost(id, getUserId(req), new Date());
  if (!post) return res.status(404).json({ error: "Post not found" });

  await db
    .insert(pulseReactionsTable)
    .values({ postId: id, userId: getUserId(req), type: type as PulseReactionType })
    .onConflictDoUpdate({
      target: [pulseReactionsTable.postId, pulseReactionsTable.userId],
      set: { type: sql`excluded.type` },
    });

  return res.json({ success: true, type });
});

// DELETE /pulse/posts/:id/react — remove own reaction.
// Requires the post to be visible before mutating.
router.delete("/pulse/posts/:id/react", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const post = await findVisiblePost(id, getUserId(req), new Date());
  if (!post) return res.status(404).json({ error: "Post not found" });

  await db
    .delete(pulseReactionsTable)
    .where(and(eq(pulseReactionsTable.postId, id), eq(pulseReactionsTable.userId, getUserId(req))));

  return res.json({ success: true });
});

export default router;
