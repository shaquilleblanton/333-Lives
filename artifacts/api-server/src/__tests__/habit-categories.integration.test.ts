import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const identity = vi.hoisted(() => ({ clerkId: "" }));
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: identity.clerkId }),
  clerkClient: { users: { getUser: vi.fn() } },
}));
vi.mock("pino-http", () => ({
  default: () => (req: { log?: unknown }, _res: unknown, next: () => void) => {
    req.log = { warn: vi.fn(), error: vi.fn() };
    next();
  },
}));

import { db } from "@workspace/db";
import { habitsTable, usersTable } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";
import app from "../app";

const owner = `habit-category-${randomUUID()}`;
const other = `habit-other-${randomUUID()}`;
const users: number[] = [];
let server: http.Server;
let base: string;
let habitId: number;

async function request(path: string, method = "GET", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-timezone": "America/New_York" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  for (const clerkId of [owner, other]) {
    const [user] = await db.insert(usersTable).values({
      clerkId, name: "Habit category regression", email: `${clerkId}@test.invalid`,
    }).returning();
    users.push(user.id);
  }
  identity.clerkId = owner;
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

afterAll(async () => {
  if (users.length) {
    await db.delete(habitsTable).where(inArray(habitsTable.userId, users));
    await db.delete(usersTable).where(inArray(usersTable.id, users));
  }
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Habit categories", () => {
  it("defaults existing-style creates to Health and persists selected categories", async () => {
    const created = await request("/habits", "POST", { name: "Walk" });
    expect(created.status).toBe(201);
    const habit = await created.json() as { id: number; category: string };
    habitId = habit.id;
    expect(habit.category).toBe("health");
    const updated = await request(`/habits/${habitId}`, "PUT", { category: "mindfulness", name: "Mindful walk" });
    expect(updated.status).toBe(200);
    expect((await updated.json() as { category: string }).category).toBe("mindfulness");
    const list = await request("/habits");
    expect(await list.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: habitId, category: "mindfulness", name: "Mindful walk" }),
    ]));
  });

  it("rejects unsupported categories without updating the habit", async () => {
    expect((await request("/habits", "POST", { name: "Invalid", category: "invalid" })).status).toBe(400);
    expect((await request(`/habits/${habitId}`, "PUT", { category: "invalid" })).status).toBe(400);
  });

  it("does not expose or let another user edit the owner's categorized habit", async () => {
    identity.clerkId = other;
    const list = await request("/habits");
    expect(await list.json()).toEqual([]);
    expect((await request(`/habits/${habitId}`, "PUT", { category: "work" })).status).toBe(404);
    identity.clerkId = owner;
  });
});
