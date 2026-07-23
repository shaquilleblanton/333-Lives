import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  vaultItemsTable,
  insertVaultItemSchema,
  vaultContactsTable,
  insertVaultContactSchema,
  updateVaultContactSchema,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── Vault Items ───────────────────────────────────────────────────────────────

router.get("/vault", async (req, res) => {
  const { category } = req.query;
  const rows = await db.select().from(vaultItemsTable).where(eq(vaultItemsTable.userId, getUserId(req)));
  const result = rows.filter((v) => !category || v.category === category);
  return res.json(result);
});

router.post("/vault", async (req, res) => {
  const parsed = insertVaultItemSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(vaultItemsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.get("/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db
    .select()
    .from(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))))
    .limit(1);
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
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Vault item not found" });
  return res.json(updated[0]);
});

router.delete("/vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

// ── Vault Contacts ────────────────────────────────────────────────────────────

router.get("/vault-contacts", async (req, res) => {
  const rows = await db
    .select()
    .from(vaultContactsTable)
    .where(eq(vaultContactsTable.userId, getUserId(req)));
  return res.json(rows);
});

router.post("/vault-contacts", async (req, res) => {
  const userId = getUserId(req);
  const parsed = insertVaultContactSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  // Enforce max 2 contacts (priority 1 and 2)
  const existing = await db
    .select({ id: vaultContactsTable.id })
    .from(vaultContactsTable)
    .where(
      and(
        eq(vaultContactsTable.userId, userId),
        eq(vaultContactsTable.priority, parsed.data.priority),
      ),
    );

  let inserted;
  if (existing.length > 0) {
    // Upsert: replace the existing contact at this priority
    inserted = await db
      .update(vaultContactsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(vaultContactsTable.userId, userId),
          eq(vaultContactsTable.priority, parsed.data.priority),
        ),
      )
      .returning();
  } else {
    inserted = await db.insert(vaultContactsTable).values(parsed.data).returning();
  }

  return res.status(201).json(inserted[0]);
});

router.patch("/vault-contacts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateVaultContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(vaultContactsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(vaultContactsTable.id, id), eq(vaultContactsTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Contact not found" });
  return res.json(updated[0]);
});

router.delete("/vault-contacts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(vaultContactsTable)
    .where(and(eq(vaultContactsTable.id, id), eq(vaultContactsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
