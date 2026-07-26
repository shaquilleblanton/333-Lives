import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { legacyLettersTable, insertLegacyLetterSchema, updateLegacyLetterSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/legacy-letters", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  let rows = await db.select().from(legacyLettersTable).where(eq(legacyLettersTable.userId, getUserId(req)));
  if (status) rows = rows.filter(e => e.status === status);
  return res.json(rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
});

router.get("/legacy-letters/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const rows = await db.select().from(legacyLettersTable).where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req)))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Letter not found" });
  return res.json(rows[0]);
});

router.post("/legacy-letters", async (req, res) => {
  const parsed = insertLegacyLetterSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(legacyLettersTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/legacy-letters/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const parsed = updateLegacyLetterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const existing = await db.select().from(legacyLettersTable).where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req)))).limit(1);
  if (existing.length === 0) return res.status(404).json({ error: "Letter not found" });
  const validated = insertLegacyLetterSchema.safeParse({ ...existing[0], ...parsed.data });
  if (!validated.success) return res.status(400).json({ error: validated.error.message });
  const updated = await db.update(legacyLettersTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req)))).returning();
  return res.json(updated[0]);
});

router.post("/legacy-letters/:id/seal", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const updated = await db.update(legacyLettersTable)
    .set({ isSealed: true, status: "sealed", updatedAt: new Date() })
    .where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Letter not found" });
  return res.json(updated[0]);
});

router.post("/legacy-letters/:id/unseal", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const updated = await db.update(legacyLettersTable)
    .set({ isSealed: false, status: "draft", updatedAt: new Date() })
    .where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Letter not found" });
  return res.json(updated[0]);
});

router.delete("/legacy-letters/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  await db.delete(legacyLettersTable).where(and(eq(legacyLettersTable.id, id), eq(legacyLettersTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
