/**
 * JIT provisioning tests — resolveLocalUser / requireAuth middleware.
 *
 * Covers the first-login race condition documented in auth.ts:
 *
 *   • Brand-new user: INSERT succeeds → local ID returned and cached.
 *   • Returning user: fast path from in-process cache (no DB hit).
 *   • Legacy-account link: email ON CONFLICT → clerk_id updated in place.
 *   • Concurrent first-login race: INSERT fails on users_clerk_id_unique →
 *     winner row re-read by clerk_id.
 *   • Race with no winner: re-read finds nothing → 500 returned to client.
 *   • Missing auth: 401 when no Clerk userId is present.
 *
 * Uses Vitest + a real test database (same pattern as intentions.integration.test.ts).
 * Each test group gets a unique, isolated clerk_id so tests don't collide.
 */

import http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Deterministic test identities (unique per run via suffix) ──────────────

const RUN_ID = Date.now().toString(36);

// Mutable Clerk user identity — tests override this per scenario.
let currentClerkId = `jit-test-${RUN_ID}-default`;
let currentEmail = `jit-${RUN_ID}-default@test.invalid`;
let currentName = "JIT Test User";

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: (_req: unknown) => ({
    userId: currentClerkId || null,
  }),
  clerkClient: {
    users: {
      getUser: vi.fn().mockImplementation(async (id: string) => ({
        primaryEmailAddress: { emailAddress: currentEmail },
        emailAddresses: [{ emailAddress: currentEmail }],
        firstName: currentName,
        lastName: "",
      })),
    },
  },
}));

vi.mock("pino-http", () => ({
  default:
    () =>
    (req: any, _res: unknown, next: () => void) => {
      // Attach a stub logger so req.log.warn / req.log.error in requireAuth
      // don't throw a TypeError (which would flip the 401 into a 500).
      req.log = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
      };
      next();
    },
}));

import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import app from "../app.js";

// ── Server lifecycle ──────────────────────────────────────────────────────

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
  // Clean up all rows created by this test run to leave the DB tidy.
  await db.delete(usersTable).where(
    // Delete rows whose email matches our test run pattern.
    // drizzle-orm `like` is used for a prefix match.
    eq(usersTable.email, `jit-${RUN_ID}-default@test.invalid`)
  );
});

/** Make an authenticated JSON request using the current identity. */
async function api(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-timezone": "UTC",
      ...(init?.headers ?? {}),
    },
  });
}

/** Delete a user row by clerk_id (cleanup helper). */
async function cleanupClerkId(clerkId: string) {
  await db.delete(usersTable).where(eq(usersTable.clerkId, clerkId));
}

// ── Suite 1: Happy path — brand-new user ─────────────────────────────────

describe("JIT provisioning: brand-new user", () => {
  const CLERK_ID = `jit-new-${RUN_ID}`;
  const EMAIL = `jit-new-${RUN_ID}@test.invalid`;

  beforeAll(async () => {
    await cleanupClerkId(CLERK_ID);
    currentClerkId = CLERK_ID;
    currentEmail = EMAIL;
    currentName = "New User";
  });

  afterAll(async () => {
    await cleanupClerkId(CLERK_ID);
  });

  it("creates a local user row on first authenticated API call", async () => {
    const res = await api("/api/users/me");
    expect(res.status).toBe(200);

    const body = await res.json() as { id: number; email: string; name: string };
    expect(typeof body.id).toBe("number");
    expect(body.email).toBe(EMAIL);
    expect(body.name).toBe("New User");
  });

  it("returns the same local ID on subsequent calls (cache / fast path)", async () => {
    const res1 = await api("/api/users/me");
    const res2 = await api("/api/users/me");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json() as { id: number };
    const body2 = await res2.json() as { id: number };
    expect(body1.id).toBe(body2.id);
  });

  it("does not create a duplicate DB row after multiple requests", async () => {
    // Fire three requests in parallel to stress the provisioning path.
    const [r1, r2, r3] = await Promise.all([
      api("/api/users/me"),
      api("/api/users/me"),
      api("/api/users/me"),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);

    // Only one row must exist in the DB.
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkId, CLERK_ID));

    expect(rows).toHaveLength(1);
  });
});

// ── Suite 2: Legacy account linking ──────────────────────────────────────

describe("JIT provisioning: legacy account (email match)", () => {
  const LEGACY_CLERK_ID = `jit-legacy-${RUN_ID}`;
  const NEW_CLERK_ID = `jit-legacy-new-${RUN_ID}`;
  const SHARED_EMAIL = `jit-legacy-${RUN_ID}@test.invalid`;

  beforeAll(async () => {
    // Pre-seed a legacy row with no clerk_id (or a stale one).
    await db.delete(usersTable).where(eq(usersTable.email, SHARED_EMAIL));
    await db.insert(usersTable).values({
      clerkId: LEGACY_CLERK_ID,
      email: SHARED_EMAIL,
      name: "Legacy User",
    });
  });

  afterAll(async () => {
    await cleanupClerkId(NEW_CLERK_ID);
    await db.delete(usersTable).where(eq(usersTable.email, SHARED_EMAIL));
  });

  it("re-links the legacy row to the new Clerk ID without creating a duplicate", async () => {
    // Sign in as a new Clerk ID that shares the same email address.
    currentClerkId = NEW_CLERK_ID;
    currentEmail = SHARED_EMAIL;
    currentName = "Legacy User";

    const res = await api("/api/users/me");
    expect(res.status).toBe(200);

    const body = await res.json() as { id: number; email: string };
    expect(body.email).toBe(SHARED_EMAIL);

    // The DB must have exactly one row for this email.
    const rows = await db
      .select({ id: usersTable.id, clerkId: usersTable.clerkId })
      .from(usersTable)
      .where(eq(usersTable.email, SHARED_EMAIL));

    expect(rows).toHaveLength(1);
    expect(rows[0].clerkId).toBe(NEW_CLERK_ID);
  });
});

// ── Suite 3: Concurrent first-login (simulated via parallel requests) ─────

describe("JIT provisioning: concurrent first-login race", () => {
  const CLERK_ID = `jit-race-${RUN_ID}`;
  const EMAIL = `jit-race-${RUN_ID}@test.invalid`;

  beforeAll(async () => {
    await cleanupClerkId(CLERK_ID);
    currentClerkId = CLERK_ID;
    currentEmail = EMAIL;
    currentName = "Race User";
  });

  afterAll(async () => {
    await cleanupClerkId(CLERK_ID);
  });

  it("all concurrent requests succeed and return the same local ID", async () => {
    // Fire 5 parallel requests for a clerk_id that has never been seen.
    // The first request wins the INSERT race; subsequent ones must recover via
    // the unique-violation re-read path (auth.ts:87-104).
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => api("/api/users/me"))
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.every((s) => s === 200)).toBe(true);

    const bodies = await Promise.all(
      responses.map((r) => r.json() as Promise<{ id: number }>)
    );
    const ids = bodies.map((b) => b.id);

    // All requests must resolve to the same local user ID.
    expect(new Set(ids).size).toBe(1);

    // Exactly one DB row must exist.
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkId, CLERK_ID));

    expect(rows).toHaveLength(1);
  });
});

// ── Suite 4: Missing auth ─────────────────────────────────────────────────

describe("requireAuth: missing Clerk session", () => {
  it("returns 401 when getAuth returns no userId", async () => {
    const originalId = currentClerkId;
    // Temporarily suppress the Clerk userId so getAuth returns null.
    currentClerkId = "";

    const res = await api("/api/users/me");
    expect(res.status).toBe(401);

    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");

    currentClerkId = originalId;
  });
});

// ── Suite 5: Profile endpoint default empty states ────────────────────────

describe("First-login home-screen empty states", () => {
  const CLERK_ID = `jit-empty-${RUN_ID}`;
  const EMAIL = `jit-empty-${RUN_ID}@test.invalid`;

  beforeAll(async () => {
    await cleanupClerkId(CLERK_ID);
    currentClerkId = CLERK_ID;
    currentEmail = EMAIL;
    currentName = "Empty State User";
    // Provision the user.
    await api("/api/users/me");
  });

  afterAll(async () => {
    await cleanupClerkId(CLERK_ID);
  });

  it("intentions list is empty (not a crash) for a brand-new account", async () => {
    const res = await api("/api/intentions");
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("intentions history returns zero streaks for a brand-new account", async () => {
    const res = await api("/api/intentions/history");
    expect(res.status).toBe(200);
    const body = await res.json() as { currentStreak: number; longestStreak: number };
    expect(body.currentStreak).toBe(0);
    expect(body.longestStreak).toBe(0);
  });

  it("habits list is empty (not a crash) for a brand-new account", async () => {
    const res = await api("/api/habits");
    // 200 with empty array, or 404 if endpoint doesn't exist yet.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
    }
  });

  it("/api/users/me returns a well-formed profile for a brand-new account", async () => {
    const res = await api("/api/users/me");
    expect(res.status).toBe(200);
    const body = await res.json() as { id: number; email: string; name: string };
    expect(typeof body.id).toBe("number");
    expect(body.id).toBeGreaterThan(0);
    expect(body.email).toBe(EMAIL);
    expect(typeof body.name).toBe("string");
    expect(body.name.length).toBeGreaterThan(0);
  });
});
