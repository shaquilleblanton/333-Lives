import http from "node:http";
import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ clerkId: "regression-owner" as string | null }));
const storage = vi.hoisted(() => ({
  associateObjectEntity: vi.fn((path: string) => Promise.resolve(path)),
  deleteObjectEntityFile: vi.fn(() => Promise.resolve()),
  loadVaultFile: vi.fn(() => Promise.resolve({ data: Buffer.from("encrypted"), originalContentType: "text/plain" })),
  saveVaultFile: vi.fn(() => Promise.resolve("/private/vault/new")),
  deleteVaultFile: vi.fn(() => Promise.resolve()),
  removeVaultFile: vi.fn(() => Promise.resolve()),
  getObjectEntityFile: vi.fn(() => Promise.resolve({ getMetadata: async () => [{ metadata: {} }] })),
  trySetObjectEntityAclPolicy: vi.fn(),
  getObjectEntityUploadURL: vi.fn(),
  getPublicObjectSearchPaths: vi.fn(),
  getPrivateObjectDir: vi.fn(() => "/private"),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: identity.clerkId }),
  clerkClient: { users: { getUser: vi.fn().mockResolvedValue({ primaryEmailAddress: { emailAddress: "regression@test.invalid" }, emailAddresses: [] }) } },
}));
vi.mock("pino-http", () => ({
  default: () => (req: { log?: unknown }, _res: unknown, next: () => void) => {
    req.log = { warn: vi.fn(), error: vi.fn() };
    next();
  },
}));
vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: vi.fn(function () { return storage; }),
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));

import { db } from "@workspace/db";
import {
  communityCalendarTable, familyInviteAttemptTable, familyLinksTable, legacyLettersTable, peopleTable,
  storyAnswersTable, usersTable, vaultItemsTable,
} from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app.js";
import { encryptBuffer } from "../lib/vaultCrypto.js";

let server: http.Server;
let baseUrl: string;
let ownerId: number;
let viewerId: number;
let unrelatedId: number;
const created = { vault: [] as number[], letters: [] as number[], events: [] as number[] };

async function api(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
}
async function as(clerkId: string, path: string, init: RequestInit = {}) {
  identity.clerkId = clerkId;
  return api(path, init);
}
async function user(clerkId: string, name: string) {
  const [row] = await db.insert(usersTable).values({ clerkId, name, email: `${clerkId}@test.invalid` })
    .onConflictDoUpdate({ target: usersTable.clerkId, set: { name } }).returning();
  return row.id;
}

beforeAll(async () => {
  ownerId = await user("regression-owner", "Regression Owner");
  viewerId = await user("regression-viewer", "Regression Viewer");
  unrelatedId = await user("regression-unrelated", "Regression Unrelated");
  server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
afterEach(async () => {
  if (created.vault.length) await db.delete(vaultItemsTable).where(inArray(vaultItemsTable.id, created.vault.splice(0)));
  if (created.letters.length) await db.delete(legacyLettersTable).where(inArray(legacyLettersTable.id, created.letters.splice(0)));
  if (created.events.length) await db.delete(communityCalendarTable).where(inArray(communityCalendarTable.id, created.events.splice(0)));
  await db.delete(storyAnswersTable).where(eq(storyAnswersTable.userId, ownerId));
  await db.delete(familyLinksTable).where(orUsers(ownerId, viewerId));
  await db.delete(familyInviteAttemptTable).where(eq(
    familyInviteAttemptTable.key,
    createHash("sha256").update(String(viewerId)).digest("hex"),
  ));
  await db.delete(peopleTable).where(inArray(peopleTable.userId, [ownerId, viewerId]));
  vi.clearAllMocks();
});
function orUsers(a: number, b: number) { return inArray(familyLinksTable.inviterId, [a, b]); }
afterAll(async () => {
  await db.delete(peopleTable).where(eq(peopleTable.userId, ownerId));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, viewerId, unrelatedId]));
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("API authorization regressions", () => {
  it("prevents a second user from patching, reading, deleting, or associating another user's Vault object", async () => {
    const [item] = await db.insert(vaultItemsTable).values({
      userId: ownerId, name: "regression vault", category: "document",
      fileUrl: "/private/vault/owner/file",
    }).returning();
    created.vault.push(item.id);
    expect((await as("regression-viewer", `/vault/${item.id}`)).status).toBe(404);
    expect((await as("regression-viewer", `/vault/${item.id}/file`)).status).toBe(403);
    expect((await as("regression-viewer", `/vault/${item.id}`, { method: "PATCH", body: JSON.stringify({ name: "hijacked" }) })).status).toBe(404);
    expect((await as("regression-viewer", `/vault/${item.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await db.select().from(vaultItemsTable).where(eq(vaultItemsTable.id, item.id)))[0]?.name).toBe("regression vault");
    storage.associateObjectEntity.mockRejectedValueOnce(new Error("wrong owner"));
    const associate = await as("regression-viewer", "/legacy-letters", { method: "POST", body: JSON.stringify({
      title: "association regression", recipientName: "Owner", mediaType: "voice", mediaUrl: "/objects/uploads/owner/file",
    }) });
    expect(associate.status).toBe(400);
  });

  it("revokes family Vault file access immediately after unlink", async () => {
    const [link] = await db.insert(familyLinksTable).values({
      inviterId: ownerId, inviteeId: viewerId, token: "regression-family-token", acceptedAt: new Date(),
    }).returning();
    const [item] = await db.insert(vaultItemsTable).values({
      userId: ownerId, name: "family regression", category: "document", visibility: "family",
      fileUrl: "/private/vault/owner/family",
    }).returning();
    created.vault.push(item.id);
    storage.loadVaultFile.mockResolvedValue({ data: encryptBuffer(Buffer.from("family file")) as never, originalContentType: "text/plain" });
    expect((await as("regression-viewer", `/vault/${item.id}/file`)).status).toBe(200);
    expect((await as("regression-viewer", `/vault/family/members/${link.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await as("regression-viewer", `/vault/${item.id}/file`)).status).toBe(403);
  });

  it("expires pending invites and lets only the inviter revoke them", async () => {
    const createdInvite = await as("regression-owner", "/vault/family/invite", { method: "POST" });
    expect(createdInvite.status).toBe(201);
    const invite = await createdInvite.json() as { id: number; token: string; expiresAt: string };
    expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect((await as("regression-viewer", `/vault/family/invites/${invite.id}`, { method: "DELETE" })).status).toBe(404);
    await db.update(familyLinksTable).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(familyLinksTable.id, invite.id));
    expect((await as("regression-viewer", `/vault/family/invite/${invite.token}/accept`, { method: "POST" })).status).toBe(404);
    expect((await as("regression-owner", `/vault/family/invites/${invite.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await as("regression-viewer", `/vault/family/invite/${invite.token}/accept`, { method: "POST" })).status).toBe(404);
    const [stored] = await db.select().from(familyLinksTable).where(eq(familyLinksTable.id, invite.id));
    expect(stored.inviteeId).toBeNull();
    expect(stored.revokedAt).not.toBeNull();
  });

  it("accepts an invite immediately before its seven-day expiry and rejects it at the boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const createdAt = new Date("2025-01-01T12:00:00.000Z");
    vi.setSystemTime(createdAt);

    try {
      const firstResponse = await as("regression-owner", "/vault/family/invite", { method: "POST" });
      const secondResponse = await as("regression-owner", "/vault/family/invite", { method: "POST" });
      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
      const firstInvite = await firstResponse.json() as { token: string; expiresAt: string };
      const secondInvite = await secondResponse.json() as { token: string; expiresAt: string };
      const expiry = new Date("2025-01-08T12:00:00.000Z");
      expect(firstInvite.expiresAt).toBe(expiry.toISOString());
      expect(secondInvite.expiresAt).toBe(expiry.toISOString());

      vi.setSystemTime(new Date(expiry.getTime() - 1));
      expect((await as("regression-viewer", `/vault/family/invite/${firstInvite.token}/accept`, { method: "POST" })).status).toBe(200);

      vi.setSystemTime(expiry);
      const expired = await as("regression-viewer", `/vault/family/invite/${secondInvite.token}/accept`, { method: "POST" });
      expect(expired.status).toBe(404);
      expect(await expired.json()).toEqual({ error: "Invite not found or expired" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 429 on the tenth invalid invite attempt within 15 minutes and resets after the window", async () => {
    const key = createHash("sha256").update(String(viewerId)).digest("hex");
    const path = "/vault/family/invite/not-a-real-token/accept";
    for (let attempt = 1; attempt <= 9; attempt++) {
      expect((await as("regression-viewer", path, { method: "POST" })).status, `attempt ${attempt}`).toBe(404);
    }
    expect((await as("regression-viewer", path, { method: "POST" })).status, "attempt 10").toBe(429);
    expect((await as("regression-viewer", path, { method: "POST" })).status).toBe(429);
    await db.update(familyInviteAttemptTable)
      .set({ windowStartedAt: new Date(Date.now() - 16 * 60 * 1000) })
      .where(eq(familyInviteAttemptTable.key, key));
    expect((await as("regression-viewer", path, { method: "POST" })).status).toBe(404);
    const [counter] = await db.select().from(familyInviteAttemptTable).where(eq(familyInviteAttemptTable.key, key));
    expect(counter.attemptCount).toBe(1);
  });

  it("rejects upload cleanup when the request is unauthenticated", async () => {
    const previousIdentity = identity.clerkId;
    identity.clerkId = null;
    try {
      const response = await api("/storage/uploads/cleanup", {
        method: "POST",
        body: JSON.stringify({ objectPath: `/objects/uploads/${ownerId}/legacy-letters/cleanup-unauthenticated` }),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
      expect(storage.deleteObjectEntityFile).not.toHaveBeenCalled();
    } finally {
      identity.clerkId = previousIdentity;
    }
  });

  it("rejects cleanup when the upload path belongs to another user", async () => {
    const objectPath = `/objects/uploads/${ownerId}/cleanup-other-owner`;
    const response = await as("regression-viewer", "/storage/uploads/cleanup", {
      method: "POST",
      body: JSON.stringify({ objectPath }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "This upload does not belong to the current user" });
    expect(storage.getObjectEntityFile).not.toHaveBeenCalled();
    expect(storage.deleteObjectEntityFile).not.toHaveBeenCalled();
  });

  it("refuses cleanup when a legacy letter references the upload", async () => {
    const objectPath = `/objects/uploads/${ownerId}/legacy-letters/cleanup-associated`;
    const [letter] = await db.insert(legacyLettersTable).values({
      userId: ownerId,
      title: "cleanup association regression",
      content: "test",
      recipientName: "Test",
      mediaUrl: objectPath,
    }).returning();
    created.letters.push(letter.id);

    const response = await as("regression-owner", "/storage/uploads/cleanup", {
      method: "POST",
      body: JSON.stringify({ objectPath }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "This upload is already associated with saved media" });
    expect(storage.getObjectEntityFile).not.toHaveBeenCalled();
    expect(storage.deleteObjectEntityFile).not.toHaveBeenCalled();
  });

  it("deletes an owned upload when no legacy letter references it", async () => {
    const objectPath = `/objects/uploads/${ownerId}/legacy-letters/cleanup-unassociated`;
    const response = await as("regression-owner", "/storage/uploads/cleanup", {
      method: "POST",
      body: JSON.stringify({ objectPath }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(storage.getObjectEntityFile).toHaveBeenCalledWith(objectPath);
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith(objectPath);
  });

  it("deletes Legacy Letter and Story Answer media only after successful update or deletion", async () => {
    const [letter] = await db.insert(legacyLettersTable).values({
      userId: ownerId, title: "media regression", content: "text", recipientName: "Test",
      mediaUrl: "/objects/old-letter",
    }).returning();
    created.letters.push(letter.id);
    const rejected = await as("regression-owner", `/legacy-letters/${letter.id}`, {
      method: "PUT", body: JSON.stringify({ mediaType: "invalid" }),
    });
    expect(rejected.status).toBe(400);
    expect(storage.deleteObjectEntityFile).not.toHaveBeenCalled();
    const update = await as("regression-owner", `/legacy-letters/${letter.id}`, { method: "PUT", body: JSON.stringify({ content: "updated", mediaUrl: "/objects/new-letter" }) });
    expect(update.status).toBe(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/old-letter");
    const answer = await as("regression-owner", "/story-answers/chapter-regression/prompt-regression", {
      method: "PUT", body: JSON.stringify({ textAnswer: "answer", audioUrl: "/objects/old-audio" }),
    });
    expect(answer.status).toBe(200);
    const replace = await as("regression-owner", "/story-answers/chapter-regression/prompt-regression", {
      method: "PUT", body: JSON.stringify({ textAnswer: "changed", audioUrl: "/objects/new-audio" }),
    });
    expect(replace.status).toBe(200);
    await as("regression-owner", "/story-answers/chapter-regression/prompt-regression", { method: "DELETE" });
    await new Promise(resolve => setImmediate(resolve));
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/old-audio");
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/new-audio");
    await as("regression-owner", `/legacy-letters/${letter.id}`, { method: "DELETE" });
    await new Promise(resolve => setImmediate(resolve));
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith("/objects/new-letter");
  });

  it("shows only permitted community events and restricts RSVP to the viewer's Circle", async () => {
    await db.insert(peopleTable).values({ userId: viewerId, name: "Owner in Circle", linkedUserId: ownerId, isCircle: true });
    const rows = await db.insert(communityCalendarTable).values([
      { userId: ownerId, title: "Open regression", category: "other", startDate: "2026-08-01", windowType: "open" },
      { userId: ownerId, title: "Locked regression", category: "other", startDate: "2026-08-02", windowType: "locked" },
      { userId: ownerId, title: "Private regression", category: "other", startDate: "2026-08-03", windowType: "private", isPublic: false },
      { userId: unrelatedId, title: "Unrelated regression", category: "other", startDate: "2026-08-04", windowType: "open" },
    ]).returning();
    created.events.push(...rows.map(r => r.id));
    const list = await as("regression-viewer", "/community");
    const body = await list.json() as Array<{ title: string }>;
    expect(list.status).toBe(200);
    expect(body.map(e => e.title)).toEqual(["Open regression", "Busy"]);
    expect((await as("regression-viewer", `/community/${rows[0].id}/respond`, { method: "POST", body: JSON.stringify({ status: "confirmed" }) })).status).toBe(200);
    expect((await as("regression-viewer", `/community/${rows[3].id}/respond`, { method: "POST", body: JSON.stringify({ status: "confirmed" }) })).status).toBe(404);
    expect((await as("regression-viewer", `/community/${rows[2].id}/respond`, { method: "POST", body: JSON.stringify({ status: "confirmed" }) })).status).toBe(404);
  });
});