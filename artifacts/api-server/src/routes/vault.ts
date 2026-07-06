import { Router } from "express";
import { db } from "@workspace/db";
import { vaultItemsTable, insertVaultItemSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEFAULT_USER_ID = 1;

router.get("/vault", async (req, res) => {
  const { category } = req.query;
  const rows = await db.select().from(vaultItemsTable).where(eq(vaultItemsTable.userId, DEFAULT_USER_ID));
  const result = rows.filter((v) => !category || v.category === category);
  return res.json(result);
});

router.post("/vault", async (req, res) => {
  const parsed = insertVaultItemSchema.safeParse({ ...req.body, userId: DEFAULT_USER_ID });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(vaultItemsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.get("/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(vaultItemsTable).where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, DEFAULT_USER_ID))).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Vault item not found" });
  return res.json(rows[0]);
});

const updateVaultItemSchema = insertVaultItemSchema.partial().omit({ userId: true });

router.patch("/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateVaultItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(vaultItemsTable)
    .set(parsed.data)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, DEFAULT_USER_ID)))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Vault item not found" });
  return res.json(updated[0]);
});

router.delete("/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(vaultItemsTable).where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, DEFAULT_USER_ID)));
  return res.json({ success: true });
});

export default router;
