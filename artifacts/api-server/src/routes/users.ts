import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, updateUserSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_USER_ID = 1;

async function ensureDefaultUser() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(usersTable).values({
      name: "James Carter",
      email: "james@333lives.com",
      bio: "Building a legacy, one day at a time.",
      streakDays: 24,
      messagesSent: 124,
      goalsActive: 18,
    });
  }
}

router.get("/users/me", async (req, res) => {
  await ensureDefaultUser();
  const users = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1);
  if (users.length === 0) return res.status(404).json({ error: "User not found" });
  return res.json(users[0]);
});

router.put("/users/me", async (req, res) => {
  await ensureDefaultUser();
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, DEFAULT_USER_ID)).returning();
  return res.json(updated[0]);
});

export default router;
