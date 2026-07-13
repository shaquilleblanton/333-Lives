import { Router } from "express";
import { getUserId, requireOwner } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  pulsePostsTable,
  pulseReactionsTable,
  // pulseCircleMembersTable is defined in schema but not used for runtime circle
  // resolution — circles are driven exclusively by people.linkedUserId/isCircle.
  // The table is retained for potential future features (e.g. cross-user explicit
  // invitations) and can be removed in a follow-up cleanup task.
  insertPulsePostSchema,
  usersTable,
  peopleTable,
  PULSE_REACTION_TYPES,
  type PulseReactionType,
} from "@workspace/db/schema";
import { eq, and, or, gt, isNull, isNotNull, desc, inArray, sql } from "drizzle-orm";
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
 * Circle resolution is People-based: a user's circle consists of the app-user
 * accounts linked to their People entries where isCircle=true. The owner
 * manages circles by:
 *   1. Creating a Person entry (POST /people).
 *   2. Setting linkedUserId + isCircle=true on it (PATCH /people/:id).
 *
 * Default is least-privilege: an empty circle means the current user sees only
 * their own posts. Self is always included.
 */
async function resolveVisibleUserIds(userId: number): Promise<number[]> {
  const circleRows = await db
    .select({ linkedUserId: peopleTable.linkedUserId })
    .from(peopleTable)
    .where(
      and(
        eq(peopleTable.userId, userId),
        eq(peopleTable.isCircle, true),
        isNotNull(peopleTable.linkedUserId),
      ),
    );

  const circleUserIds = circleRows
    .map((r) => r.linkedUserId)
    .filter((id): id is number => id !== null);

  return [...new Set([userId, ...circleUserIds])];
}

/**
 * Returns the media proxy path for a post, or null when no media is attached.
 * Clients must fetch media through this path (never directly from storage) so
 * that the circle-visibility gate is enforced before any bytes are served.
 */
function mediaProxyPath(postId: number, rawMediaUrl: string | null): string | null {
  return rawMediaUrl ? `/pulse/posts/${postId}/media` : null;
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
      // mediaUrl is a circle-checked proxy path, never a raw storage path.
      // Fetch via /api/pulse/posts/:id/media which enforces circle visibility.
      mediaUrl: mediaProxyPath(post.id, post.mediaUrl),
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

// GET /pulse/feed — posts from users in the current user's People-based circle (+ own posts).
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

// POST /pulse/posts — create a post. Media is stored as owner-private (ACL=private);
// it is served exclusively through the circle-checked /pulse/posts/:id/media endpoint.
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

  // ACL: private (owner-only in storage layer). Media is served exclusively
  // through GET /pulse/posts/:id/media which enforces circle visibility before
  // proxying any bytes. This ensures media is never accessible outside the circle.
  if (mediaUrl) {
    try {
      await objectStorage.trySetObjectEntityAclPolicy(mediaUrl, {
        owner: String(getUserId(req)),
        visibility: "private",
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
    mediaUrl: mediaProxyPath(post.id, post.mediaUrl),
    type: post.type,
    isPersistent: post.isPersistent,
    expiresAt: post.expiresAt?.toISOString() ?? null,
    reactions: emptyReactions(),
    myReaction: null,
    reactorNames: [],
    createdAt: post.createdAt.toISOString(),
  });
});

// DELETE /pulse/posts/:id — delete own post (ownership check is sufficient — no circle needed).
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

// GET /pulse/posts/:id/media — circle-checked media proxy.
// The raw storage path is never exposed to clients; all media is routed through
// here so that circle-visibility is enforced before any bytes are served.
// Uses server-side object download (ACL bypassed after the circle gate passes).
router.get("/pulse/posts/:id/media", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const post = await findVisiblePost(id, getUserId(req), new Date());
  if (!post || !post.mediaUrl) return res.status(404).json({ error: "Media not found" });

  try {
    const file = await objectStorage.getObjectEntityFile(post.mediaUrl);
    const downloadResponse = await objectStorage.downloadObject(file);
    const contentType = downloadResponse.headers.get("Content-Type") ?? "application/octet-stream";
    const contentLength = downloadResponse.headers.get("Content-Length");
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    if (contentLength) res.set("Content-Length", contentLength);
    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    return res.send(buffer);
  } catch {
    return res.status(404).json({ error: "Media object not found" });
  }
});

// PUT /pulse/posts/:id/react — add or change reaction (one per user per post).
// Requires the post to be visible (circle check) before mutating.
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
// Requires the post to be visible (circle check) before mutating.
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

// ─── Owner-only: Circle management via People ────────────────────────────────
//
// Circles are managed through the People feature:
//   1. Create a Person entry for a family member (POST /people).
//   2. Link them to their app-user account: PATCH /people/:id { linkedUserId, isCircle: true }.
//
// GET /pulse/circle — owner view of all people with isCircle=true and a linked user.
// This is a convenience read for the settings/admin UI.

router.get("/pulse/circle", requireOwner, async (req, res) => {
  const rows = await db
    .select({
      personId: peopleTable.id,
      personName: peopleTable.name,
      linkedUserId: peopleTable.linkedUserId,
      ownedByUserId: peopleTable.userId,
    })
    .from(peopleTable)
    .where(
      and(
        eq(peopleTable.isCircle, true),
        isNotNull(peopleTable.linkedUserId),
      ),
    );
  return res.json(rows);
});

export default router;
