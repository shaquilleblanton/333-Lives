import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_CLERK_ID = "account-delete-integration-clerk-id";
const mediaMocks = vi.hoisted(() => ({
  removeVaultFile: vi.fn(() => Promise.resolve()),
  deleteObjectEntityFile: vi.fn(() => Promise.resolve()),
}));
const clerkMocks = vi.hoisted(() => ({
  deleteUser: vi.fn(() => Promise.resolve()),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: () => ({ userId: "account-delete-integration-clerk-id" }),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: "account-delete-integration-clerk-id@test.invalid" },
        emailAddresses: [],
        firstName: "Delete",
        lastName: "Test",
      }),
      deleteUser: clerkMocks.deleteUser,
    },
  },
}));

vi.mock("pino-http", () => ({
  default:
    () =>
    (req: { log?: unknown }, _res: unknown, next: () => void) => {
      req.log = { warn: vi.fn(), error: vi.fn() };
      next();
    },
}));

vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: vi.fn(function () {
    return mediaMocks;
  }),
}));

import { db } from "@workspace/db";
import {
  accountDeletionsTable,
  intentionsTable,
  peopleTable,
  usersTable,
  vaultItemsTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import app from "../app.js";

let server: http.Server;
let baseUrl: string;
let deletedUserId: number;
let otherUserId: number;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
  });
}

beforeAll(async () => {
  const [deletedUser] = await db
    .insert(usersTable)
    .values({
      clerkId: TEST_CLERK_ID,
      name: "Delete Me",
      email: `${TEST_CLERK_ID}@test.invalid`,
      avatarUrl: "/objects/private/avatar-to-delete",
    })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: { avatarUrl: "/objects/private/avatar-to-delete" },
    })
    .returning({ id: usersTable.id });
  deletedUserId = deletedUser.id;

  const [otherUser] = await db
    .insert(usersTable)
    .values({
      clerkId: "account-delete-other-user",
      name: "Other User",
      email: "account-delete-other-user@test.invalid",
    })
    .onConflictDoUpdate({ target: usersTable.clerkId, set: { name: "Other User" } })
    .returning({ id: usersTable.id });
  otherUserId = otherUser.id;

  await db.insert(intentionsTable).values({
    userId: deletedUserId,
    text: "This should cascade",
    date: "2026-09-01",
    order: 0,
  });
  await db.insert(peopleTable).values({
    userId: deletedUserId,
    name: "Private person",
    photoUrl: "/objects/private/person-to-delete",
  });
  await db.insert(peopleTable).values({
    userId: otherUserId,
    name: "Linked from another account",
    linkedUserId: deletedUserId,
  });
  await db.insert(vaultItemsTable).values({
    userId: deletedUserId,
    name: "Private vault file",
    category: "document",
    fileUrl: "test-bucket/vault/private-file",
  });

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

afterAll(async () => {
  await db.delete(accountDeletionsTable).where(eq(accountDeletionsTable.clerkId, TEST_CLERK_ID));
  await db.delete(peopleTable).where(eq(peopleTable.userId, otherUserId));
  await db.delete(usersTable).where(eq(usersTable.id, otherUserId));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("account deletion", () => {
  it("deletes only the signed-in account, cleans media, and leaves a retry marker if Clerk fails", async () => {
    clerkMocks.deleteUser.mockRejectedValueOnce(new Error("temporary Clerk outage"));

    const response = await apiFetch("/users/me", {
      method: "DELETE",
      // The route must ignore any client-supplied identity.
      body: JSON.stringify({ userId: otherUserId }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Your account data was removed, but we could not finish signing you out. Please try again shortly.",
    });
    expect((await db.select().from(usersTable).where(eq(usersTable.id, deletedUserId)))).toHaveLength(0);
    expect((await db.select().from(intentionsTable).where(eq(intentionsTable.userId, deletedUserId)))).toHaveLength(0);
    expect((await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)))).toHaveLength(1);

    const linkedPerson = await db
      .select({ linkedUserId: peopleTable.linkedUserId })
      .from(peopleTable)
      .where(and(eq(peopleTable.userId, otherUserId), eq(peopleTable.name, "Linked from another account")));
    expect(linkedPerson[0].linkedUserId).toBeNull();
    expect(mediaMocks.removeVaultFile).toHaveBeenCalledWith("test-bucket/vault/private-file");
    expect(mediaMocks.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/private/avatar-to-delete");
    expect(mediaMocks.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/private/person-to-delete");
  });

  it("allows the same authenticated session to retry and finish Clerk deletion", async () => {
    clerkMocks.deleteUser.mockResolvedValueOnce();

    const response = await apiFetch("/users/me", { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(await db.select().from(accountDeletionsTable).where(eq(accountDeletionsTable.clerkId, TEST_CLERK_ID))).toHaveLength(0);
  });

  it("blocks normal access while the deletion retry marker exists", async () => {
    // This is a direct invariant check for the middleware guard; use a
    // temporary marker and remove it without recreating a user.
    await db.insert(accountDeletionsTable).values({
      clerkId: TEST_CLERK_ID,
      deletedUserId,
    });
    const response = await apiFetch("/users/me", { method: "GET" });
    expect(response.status).toBe(410);
    await db.delete(accountDeletionsTable).where(eq(accountDeletionsTable.clerkId, TEST_CLERK_ID));
  });
});