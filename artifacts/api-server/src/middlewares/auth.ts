import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
 * Linking strategy:
 * 1. Fast path — row already linked to this Clerk id (cached + DB check).
 * 2. Single atomic upsert on email:
 *    - No row with that email → INSERT a fresh row.
 *    - Row exists (legacy account, stale clerk_id, or concurrent race) →
 *      UPDATE clerk_id in place so all existing data is preserved.
 *
 * Using ON CONFLICT (email) DO UPDATE makes this crash-proof: the email
 * uniqueness constraint can never fire because we handle it explicitly, and
 * there is no window between a SELECT and an INSERT where a race can sneak in.
 */
async function resolveLocalUser(clerkUserId: string): Promise<number> {
  // Fast path: already linked.
  const linked = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  if (linked.length > 0) return linked[0].id;

  // Fetch the Clerk user's display name and primary email.
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@users.noreply`
  ).toLowerCase();
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  // Atomic upsert: insert or re-link by email.
  // ON CONFLICT (email) DO UPDATE means:
  //   • New user  → row is inserted, id returned.
  //   • Existing row (any clerk_id) → clerk_id is updated, same id returned.
  // This handles legacy accounts, stale Clerk ids (dev/prod mismatch),
  // and concurrent first-login races in one safe statement.
  const upserted = await db
    .insert(usersTable)
    .values({ clerkId: clerkUserId, email, name })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { clerkId: clerkUserId, name },
    })
    .returning({ id: usersTable.id });

  if (upserted.length > 0) return upserted[0].id;
  throw new Error("Failed to provision local user for Clerk id: " + clerkUserId);
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
      const hasAuthHeader = !!req.headers["authorization"];
      const authPrefix = hasAuthHeader
        ? (req.headers["authorization"] as string).slice(0, 20) + "…"
        : "(none)";
      req.log.warn(
        { hasAuthHeader, authPrefix, path: req.path },
        "requireAuth: no userId — auth header present?",
      );
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
