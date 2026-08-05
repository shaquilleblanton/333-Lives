/**
 * Integration tests for the 333 intentions flow.
 *
 * These tests drive the real Express app against the real database so they
 * catch mismatches between the mobile app and the actual API schema (wrong
 * field names, missing routes, changed error shapes) that fully-mocked unit
 * tests cannot.
 *
 * Flow exercised:
 *   POST /api/intentions × 3  → create three intentions for today
 *   PUT  /api/intentions/:id × 3  → complete each one
 *   GET  /api/intentions/history  → assert currentStreak === 1
 */

import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// ── Mock Clerk before importing the app ──────────────────────────────────────
// vi.mock() is hoisted by vitest so it runs before module-level code.
// Only string literals (no module-scope variables) may be used inside the
// factory — use the same fixed string as TEST_CLERK_ID below.

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: (_req: unknown) => ({
    userId: "integ-test-333-clerk-id",
  }),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        primaryEmailAddress: {
          emailAddress: "integ-test-333-clerk-id@test.invalid",
        },
        emailAddresses: [],
        firstName: "Integration",
        lastName: "Test",
      }),
    },
  },
}));

/** Matches the string literal used in the vi.mock factory above. */
const TEST_CLERK_ID = "integ-test-333-clerk-id";

// Suppress pino-http request logs to keep test output clean.
vi.mock("pino-http", () => ({
  default:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

// ── Real imports (after mocks are hoisted) ───────────────────────────────────

import { db } from "@workspace/db";
import { intentionsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import app from "../app.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD in UTC — matches what the server uses when no
 *  x-timezone header is provided. */
const TODAY = new Date().toISOString().split("T")[0];

let server: http.Server;
let baseUrl: string;
let testUserId: number;

/** Make a JSON request to the test server with the x-timezone header so the
 *  server resolves "today" in UTC, matching the TODAY constant above. */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-timezone": "UTC",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed a test user in the DB using the clerk ID the mock returns.  The fast
  // path in requireAuth looks up by clerk_id, so this row is found immediately
  // without calling clerkClient.users.getUser.
  const [user] = await db
    .insert(usersTable)
    .values({
      clerkId: TEST_CLERK_ID,
      name: "Integration Test User",
      email: `${TEST_CLERK_ID}@test.invalid`,
    })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: { name: "Integration Test User" },
    })
    .returning({ id: usersTable.id });
  testUserId = user.id;

  // Start the Express app on a random available port.
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}/api`;
});

afterAll(async () => {
  // Remove test intentions first (FK), then the test user row.
  if (testUserId) {
    await db
      .delete(intentionsTable)
      .where(eq(intentionsTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("333 flow — end-to-end against real API", () => {
  /** Collects the IDs of the three intentions created in the first test so the
   *  subsequent tests can reference them without re-querying. */
  const intentionIds: number[] = [];

  it("POST /intentions × 3 creates three intentions dated today", async () => {
    const texts = [
      "Morning walk outside",
      "Read for 20 minutes",
      "Call a friend",
    ];

    for (let i = 0; i < texts.length; i++) {
      const res = await apiFetch("/intentions", {
        method: "POST",
        body: JSON.stringify({ text: texts[i], order: i }),
      });

      expect(res.status, `POST #${i + 1} should return 201`).toBe(201);

      const body = await res.json();
      expect(body.text).toBe(texts[i]);
      expect(body.isCompleted).toBe(false);
      expect(body.date).toBe(TODAY);
      expect(typeof body.id).toBe("number");

      intentionIds.push(body.id as number);
    }

    expect(intentionIds).toHaveLength(3);
  });

  it("PUT /intentions/:id completes each of the three intentions", async () => {
    for (const id of intentionIds) {
      const res = await apiFetch(`/intentions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isCompleted: true }),
      });

      expect(res.status, `PUT intention ${id} should return 200`).toBe(200);

      const body = await res.json();
      expect(body.id).toBe(id);
      expect(body.isCompleted).toBe(true);
    }
  });

  it("GET /intentions/history reports currentStreak = 1", async () => {
    const res = await apiFetch("/intentions/history");

    expect(res.status).toBe(200);

    const body = await res.json() as {
      currentStreak: number;
      longestStreak: number;
      completedDays: string[];
    };

    // Today's date must appear in the list of fully-completed 333 days.
    expect(body.completedDays).toContain(TODAY);

    // First completed day ever → streak of exactly 1.
    expect(body.currentStreak).toBe(1);
    expect(body.longestStreak).toBeGreaterThanOrEqual(1);
  });
});
