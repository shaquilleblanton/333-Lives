import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { usersTable, updateUserSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

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

export default router;
