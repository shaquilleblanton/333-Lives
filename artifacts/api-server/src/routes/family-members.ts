import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  familyMembersTable,
  familyMemberMomentsTable,
  insertFamilyMemberSchema,
  updateFamilyMemberSchema,
  insertFamilyMemberMomentSchema,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/family-members", async (req, res) => {
  const rows = await db
    .select()
    .from(familyMembersTable)
    .where(eq(familyMembersTable.userId, getUserId(req)))
    .orderBy(familyMembersTable.name);
  return res.json(rows);
});

router.get("/family-members/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db
    .select()
    .from(familyMembersTable)
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Family member not found" });
  return res.json(rows[0]);
});

router.post("/family-members", async (req, res) => {
  const parsed = insertFamilyMemberSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(familyMembersTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/family-members/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateFamilyMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(familyMembersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Family member not found" });
  return res.json(updated[0]);
});

router.delete("/family-members/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(familyMembersTable)
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.userId, getUserId(req))));
  return res.json({ success: true });
});

router.get("/family-members/:memberId/moments", async (req, res) => {
  const memberId = Number(req.params.memberId);
  const rows = await db
    .select()
    .from(familyMemberMomentsTable)
    .where(
      and(
        eq(familyMemberMomentsTable.userId, getUserId(req)),
        eq(familyMemberMomentsTable.memberId, memberId),
      ),
    )
    .orderBy(desc(familyMemberMomentsTable.date));
  return res.json(rows);
});

router.post("/family-members/:memberId/moments", async (req, res) => {
  const memberId = Number(req.params.memberId);
  const parsed = insertFamilyMemberMomentSchema.safeParse({
    ...req.body,
    userId: getUserId(req),
    memberId,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(familyMemberMomentsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/family-members/:memberId/moments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertFamilyMemberMomentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(familyMemberMomentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(eq(familyMemberMomentsTable.id, id), eq(familyMemberMomentsTable.userId, getUserId(req))),
    )
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Moment not found" });
  return res.json(updated[0]);
});

router.delete("/family-members/:memberId/moments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(familyMemberMomentsTable)
    .where(
      and(eq(familyMemberMomentsTable.id, id), eq(familyMemberMomentsTable.userId, getUserId(req))),
    );
  return res.json({ success: true });
});

export default router;
