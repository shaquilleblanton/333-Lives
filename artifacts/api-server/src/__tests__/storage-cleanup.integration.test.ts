import http from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ clerkId: "storage-cleanup-regression-owner" as string | null }));
const storage = vi.hoisted(() => ({
  deleteObjectEntityFile: vi.fn(async () => {}),
  getObjectEntityFile: vi.fn(async () => ({
    getMetadata: async () => [{ metadata: {} }],
  })),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: identity.clerkId }),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: "storage-cleanup-owner@test.invalid" },
        emailAddresses: [],
      }),
    },
  },
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
import { usersTable, voiceMemosTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import app from "../app.js";

let server: http.Server;
let baseUrl: string;
let userId: number;
const memoIds: number[] = [];

async function cleanupApi(objectPath: string) {
  return fetch(`${baseUrl}/storage/uploads/cleanup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  });
}

beforeAll(async () => {
  const [user] = await db.insert(usersTable).values({
    clerkId: identity.clerkId!,
    name: "Storage Cleanup Regression",
    email: "storage-cleanup-owner@test.invalid",
  }).onConflictDoUpdate({
    target: usersTable.clerkId,
    set: { name: "Storage Cleanup Regression" },
  }).returning();
  userId = user.id;
  server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

afterEach(async () => {
  if (memoIds.length) {
    await db.delete(voiceMemosTable).where(inArray(voiceMemosTable.id, memoIds.splice(0)));
  }
  storage.deleteObjectEntityFile.mockClear();
  storage.getObjectEntityFile.mockClear();
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("legacy-letter upload cleanup association guards", () => {
  it("refuses to delete a same-user upload referenced by a voice memo", async () => {
    const objectPath = `/objects/uploads/${userId}/legacy-letters/shared-with-voice-memo`;
    const [memo] = await db.insert(voiceMemosTable).values({
      userId,
      title: "Keep this recording",
      objectPath,
    }).returning();
    memoIds.push(memo.id);

    const response = await cleanupApi(objectPath);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This upload is already associated with saved media",
    });
    expect(storage.getObjectEntityFile).not.toHaveBeenCalled();
    expect(storage.deleteObjectEntityFile).not.toHaveBeenCalled();
  });

  it("can remove a rejected letter upload once no entity references it", async () => {
    const objectPath = `/objects/uploads/${userId}/legacy-letters/rejected-letter-upload`;

    const response = await cleanupApi(objectPath);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(storage.getObjectEntityFile).toHaveBeenCalledWith(objectPath);
    expect(storage.deleteObjectEntityFile).toHaveBeenCalledWith(objectPath);
  });
});