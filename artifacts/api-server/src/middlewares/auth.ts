import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, pulseCircleMembersTable } from "@workspace/db/schema";
import { eq, ne, sql } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

/**
 * Returns the local (numeric) user id attached by requireAuth. Throws if the
 * route was mounted without the middleware — that is a programming error, not
 * a client error.
 */
export function getUserId(req: Request): number {
  if (typeof req.userId !== "number") {
    throw new Error("getUserId called on a request without requireAuth");
  }
  return req.userId;
}

/**
 * Resolves the local users row for a Clerk user, creating or linking one on
 * first sign-in (just-in-time provisioning).
 *
 * Linking strategy, in order:
 * 1. Row already linked to this Clerk id — use it.
 * 2. A row exists with the same email and no Clerk id — link it. This is how
 *    the legacy (pre-auth) account's data is migrated: set that row's email
 *    to the owner's real sign-in email and the link happens on first sign-in.
 * 3. Otherwise create a fresh row.
 *
 * NOTE: there is deliberately NO "first sign-in claims the unlinked legacy
 * row" rule — that would hand the original owner's data to whichever
 * stranger signs in first.
 */
async function resolveLocalUser(clerkUserId: string): Promise<number> {
  const linked = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  if (linked.length > 0) return linked[0].id;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@users.noreply`
  ).toLowerCase();
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  // Link by matching email — only claim a row that is not yet linked to a
  // different Clerk account.
  const byEmail = await db
    .select({ id: usersTable.id, clerkId: usersTable.clerkId })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (byEmail.length > 0 && byEmail[0].clerkId === null) {
    const updated = await db
      .update(usersTable)
      .set({ clerkId: clerkUserId, name })
      .where(eq(usersTable.id, byEmail[0].id))
      .returning({ id: usersTable.id });
    if (updated.length > 0) {
      const linkedUserId = updated[0].id;
      // Backfill pulse circles: an existing row that just got linked needs the
      // same bidirectional circle seeding as a fresh insert.
      try {
        const otherUsers = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(ne(usersTable.id, linkedUserId));
        if (otherUsers.length > 0) {
          const circlePairs = otherUsers.flatMap((u) => [
            { userId: linkedUserId, memberUserId: u.id },
            { userId: u.id, memberUserId: linkedUserId },
          ]);
          await db
            .insert(pulseCircleMembersTable)
            .values(circlePairs)
            .onConflictDoNothing();
        }
      } catch (err) {
        console.error("Failed to backfill pulse circle for linked user", err);
      }
      return linkedUserId;
    }
  }

  const inserted = await db
    .insert(usersTable)
    .values({ clerkId: clerkUserId, email, name })
    .onConflictDoNothing({ target: usersTable.clerkId })
    .returning({ id: usersTable.id });
  if (inserted.length > 0) {
    const newUserId = inserted[0].id;
    // Auto-add the new user to all existing users' circles, and add all
    // existing users to the new user's circle. This keeps the Pulse feed
    // working as a family-wide shared space for a closed, invite-only app.
    try {
      const existingUsers = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(ne(usersTable.id, newUserId));
      if (existingUsers.length > 0) {
        const circlePairs = existingUsers.flatMap((u) => [
          { userId: newUserId, memberUserId: u.id },
          { userId: u.id, memberUserId: newUserId },
        ]);
        await db
          .insert(pulseCircleMembersTable)
          .values(circlePairs)
          .onConflictDoNothing();
      }
    } catch (err) {
      // Non-fatal — circle can be seeded later; don't block sign-in.
      console.error("Failed to seed pulse circle for new user", err);
    }
    return newUserId;
  }

  // Concurrent request created the row first — read it back.
  const raced = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  if (raced.length > 0) return raced[0].id;
  throw new Error("Failed to provision local user");
}

// Small in-process cache so we do not hit the users table on every request.
const localIdCache = new Map<string, number>();

/**
 * Gate for admin-only routes. Must be mounted after requireAuth. Checks the
 * is_owner flag on the local users row (set only for the app owner's account).
 * Looked up fresh on every request — no cache — so revoking the flag takes
 * effect immediately.
 */
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await db
      .select({ isOwner: usersTable.isOwner })
      .from(usersTable)
      .where(eq(usersTable.id, getUserId(req)))
      .limit(1);
    if (rows.length === 0 || !rows[0].isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Owner check failure");
    res.status(500).json({ error: "Authorization failed" });
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const cached = localIdCache.get(clerkUserId);
    if (cached !== undefined) {
      req.userId = cached;
      next();
      return;
    }

    const localId = await resolveLocalUser(clerkUserId);
    localIdCache.set(clerkUserId, localId);
    req.userId = localId;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Auth middleware failure");
    res.status(500).json({ error: "Authentication failed" });
  }
}
