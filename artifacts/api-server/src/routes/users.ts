import { Router, type Request } from "express";
import {
  clearLocalUserCache,
  getClerkUserId,
  getUserId,
} from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  accountDeletionsTable,
  collectionItemsTable,
  familyMembersTable,
  legacyLettersTable,
  lifeEventsTable,
  memoryCollectionsTable,
  messagesTable,
  peopleTable,
  pulsePostsTable,
  storyAnswersTable,
  updateUserSchema,
  usersTable,
  vaultItemsTable,
  voiceMemosTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorage = new ObjectStorageService();

type AccountMedia = {
  objectPaths: string[];
  vaultPaths: string[];
};

function collectPath(paths: Set<string>, value: unknown): void {
  if (
    typeof value === "string" &&
    (value.startsWith("/objects/") || value.startsWith("https://storage.googleapis.com/"))
  ) {
    paths.add(value);
  }
}

async function collectAccountMedia(userId: number, avatarUrl: string | null): Promise<AccountMedia> {
  const [
    vaultFiles,
    voiceMemos,
    messages,
    storyAnswers,
    legacyLetters,
    collections,
    collectionItems,
    people,
    familyMembers,
    lifeEvents,
    pulsePosts,
  ] = await Promise.all([
    db.select({ fileUrl: vaultItemsTable.fileUrl }).from(vaultItemsTable).where(eq(vaultItemsTable.userId, userId)),
    db.select({ objectPath: voiceMemosTable.objectPath }).from(voiceMemosTable).where(eq(voiceMemosTable.userId, userId)),
    db.select({ audioUrl: messagesTable.audioUrl }).from(messagesTable).where(eq(messagesTable.userId, userId)),
    db.select({ audioUrl: storyAnswersTable.audioUrl }).from(storyAnswersTable).where(eq(storyAnswersTable.userId, userId)),
    db.select({ mediaUrl: legacyLettersTable.mediaUrl }).from(legacyLettersTable).where(eq(legacyLettersTable.userId, userId)),
    db.select({ coverUrl: memoryCollectionsTable.coverUrl }).from(memoryCollectionsTable).where(eq(memoryCollectionsTable.userId, userId)),
    db
      .select({ mediaUrl: collectionItemsTable.mediaUrl })
      .from(collectionItemsTable)
      .innerJoin(memoryCollectionsTable, eq(collectionItemsTable.collectionId, memoryCollectionsTable.id))
      .where(eq(memoryCollectionsTable.userId, userId)),
    db.select({ photoUrl: peopleTable.photoUrl }).from(peopleTable).where(eq(peopleTable.userId, userId)),
    db.select({ photoUrl: familyMembersTable.photoUrl }).from(familyMembersTable).where(eq(familyMembersTable.userId, userId)),
    db.select({ mediaUrls: lifeEventsTable.mediaUrls }).from(lifeEventsTable).where(eq(lifeEventsTable.userId, userId)),
    db.select({ mediaUrl: pulsePostsTable.mediaUrl }).from(pulsePostsTable).where(eq(pulsePostsTable.userId, userId)),
  ]);

  const objectPaths = new Set<string>();
  const vaultPaths = new Set<string>();
  collectPath(objectPaths, avatarUrl);
  for (const row of voiceMemos) collectPath(objectPaths, row.objectPath);
  for (const row of messages) collectPath(objectPaths, row.audioUrl);
  for (const row of storyAnswers) collectPath(objectPaths, row.audioUrl);
  for (const row of legacyLetters) collectPath(objectPaths, row.mediaUrl);
  for (const row of collections) collectPath(objectPaths, row.coverUrl);
  for (const row of collectionItems) collectPath(objectPaths, row.mediaUrl);
  for (const row of people) collectPath(objectPaths, row.photoUrl);
  for (const row of familyMembers) collectPath(objectPaths, row.photoUrl);
  for (const row of pulsePosts) collectPath(objectPaths, row.mediaUrl);
  for (const row of lifeEvents) {
    for (const attachment of row.mediaUrls ?? []) {
      collectPath(objectPaths, attachment?.objectPath);
    }
  }
  for (const row of vaultFiles) {
    if (row.fileUrl) vaultPaths.add(row.fileUrl);
  }

  return { objectPaths: [...objectPaths], vaultPaths: [...vaultPaths] };
}

async function cleanUpAccountMedia(req: Request, media: AccountMedia): Promise<void> {
  const jobs = [
    ...media.vaultPaths.map((path) => ({
      kind: "vault file",
      path,
      promise: objectStorage.removeVaultFile(path),
    })),
    ...media.objectPaths.map((path) => ({
      kind: "uploaded file",
      path,
      promise: objectStorage.deleteObjectEntityFile(path),
    })),
  ];

  const settled = await Promise.allSettled(
    jobs.map(async (job) => {
      await job.promise;
      return job;
    }),
  );
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      req.log.warn(
        { err: result.reason, path: jobs[index].path, kind: jobs[index].kind },
        "Account deletion could not remove an uploaded file",
      );
    }
  });
}

function isClerkNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ((error as { status?: unknown }).status === 404) return true;
  return isClerkNotFound((error as { cause?: unknown }).cause);
}

async function removeClerkIdentity(clerkUserId: string): Promise<boolean> {
  try {
    await clerkClient.users.deleteUser(clerkUserId);
    return true;
  } catch (error) {
    // A deleted identity is the successful end state for retries.
    if (isClerkNotFound(error)) return true;
    throw error;
  }
}

router.get("/users/me", async (req, res) => {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, getUserId(req))).limit(1);
  if (users.length === 0) return res.status(404).json({ error: "User not found" });
  return res.json(users[0]);
});

router.put("/users/me", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  // Identity fields are managed by the auth system, not editable via profile.
  // isOwner is a privilege flag that must never be self-assignable.
  const { clerkId: _clerkId, email: _email, isOwner: _isOwner, ...safe } = parsed.data;
  const updated = await db.update(usersTable).set(safe).where(eq(usersTable.id, getUserId(req))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "User not found" });
  return res.json(updated[0]);
});

/**
 * Permanently deletes the signed-in account. The client never supplies a user
 * ID: both the local row and Clerk identity are resolved from the session.
 *
 * Local data is committed first, with a minimal retry record, so a temporary
 * Clerk outage cannot cause the deleted account to be silently provisioned
 * again. Uploaded media is then cleaned up best-effort and Clerk is removed.
 */
router.delete("/users/me", async (req, res) => {
  const clerkUserId = getClerkUserId(req);

  const pending = await db
    .select()
    .from(accountDeletionsTable)
    .where(eq(accountDeletionsTable.clerkId, clerkUserId))
    .limit(1);
  if (pending.length > 0) {
    try {
      await removeClerkIdentity(clerkUserId);
      await db.delete(accountDeletionsTable).where(eq(accountDeletionsTable.id, pending[0].id));
      clearLocalUserCache(clerkUserId);
      return res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Account deletion retry could not remove Clerk identity");
      return res.status(503).json({
        error: "Your account deletion is still being completed. Please try again shortly.",
      });
    }
  }

  const localUserId = getUserId(req);
  const users = await db
    .select({ id: usersTable.id, clerkId: usersTable.clerkId, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(and(eq(usersTable.id, localUserId), eq(usersTable.clerkId, clerkUserId)))
    .limit(1);
  const user = users[0];
  if (!user) {
    clearLocalUserCache(clerkUserId);
    return res.status(404).json({ error: "User not found" });
  }

  let media: AccountMedia;
  try {
    media = await collectAccountMedia(user.id, user.avatarUrl);
    await db.transaction(async (tx) => {
      await tx
        .insert(accountDeletionsTable)
        .values({ clerkId: clerkUserId, deletedUserId: user.id })
        .onConflictDoNothing();
      const deleted = await tx
        .delete(usersTable)
        .where(and(eq(usersTable.id, user.id), eq(usersTable.clerkId, clerkUserId)))
        .returning({ id: usersTable.id });
      if (deleted.length === 0) {
        throw new Error("Account deletion did not remove the current user");
      }
    });
  } catch (error) {
    req.log.error({ err: error }, "Account deletion could not remove local data");
    return res.status(500).json({ error: "We couldn't delete your account. Please try again." });
  }

  clearLocalUserCache(clerkUserId);
  await cleanUpAccountMedia(req, media);

  try {
    await removeClerkIdentity(clerkUserId);
    await db.delete(accountDeletionsTable).where(eq(accountDeletionsTable.clerkId, clerkUserId));
    return res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Account data deleted but Clerk identity removal failed");
    return res.status(503).json({
      error: "Your account data was removed, but we could not finish signing you out. Please try again shortly.",
    });
  }
});

export default router;
