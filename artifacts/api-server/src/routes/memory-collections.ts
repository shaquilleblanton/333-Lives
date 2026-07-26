import { parseIntParam } from "../lib/params";
import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  memoryCollectionsTable,
  collectionItemsTable,
  insertMemoryCollectionSchema,
  insertCollectionItemSchema,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /memory-collections — list all collections for user
router.get("/memory-collections", async (req, res) => {
  const rows = await db
    .select()
    .from(memoryCollectionsTable)
    .where(eq(memoryCollectionsTable.userId, getUserId(req)));
  return res.json(rows);
});

// POST /memory-collections
router.post("/memory-collections", async (req, res) => {
  const parsed = insertMemoryCollectionSchema.safeParse({ ...req.body, userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(memoryCollectionsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

// GET /memory-collections/:id
router.get("/memory-collections/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const rows = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, id), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Collection not found" });
  return res.json(rows[0]);
});

const updateCollectionSchema = insertMemoryCollectionSchema.partial().omit({ userId: true });

// PATCH /memory-collections/:id
router.patch("/memory-collections/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const parsed = updateCollectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db
    .update(memoryCollectionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(memoryCollectionsTable.id, id), eq(memoryCollectionsTable.userId, getUserId(req))))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Collection not found" });
  return res.json(updated[0]);
});

// DELETE /memory-collections/:id
router.delete("/memory-collections/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  await db
    .delete(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, id), eq(memoryCollectionsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

// GET /memory-collections/:id/items
router.get("/memory-collections/:id/items", async (req, res) => {
  const collectionId = parseIntParam(req.params.id, "id");
  // Verify ownership
  const coll = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, collectionId), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (coll.length === 0) return res.status(404).json({ error: "Collection not found" });

  const items = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.collectionId, collectionId));
  items.sort((a, b) => a.sortOrder - b.sortOrder);
  return res.json(items);
});

// POST /memory-collections/:id/items
router.post("/memory-collections/:id/items", async (req, res) => {
  const collectionId = parseIntParam(req.params.id, "id");
  const coll = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, collectionId), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (coll.length === 0) return res.status(404).json({ error: "Collection not found" });

  const parsed = insertCollectionItemSchema.safeParse({ ...req.body, collectionId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(collectionItemsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

// PATCH /memory-collections/:id/items/:itemId
router.patch("/memory-collections/:id/items/:itemId", async (req, res) => {
  const collectionId = parseIntParam(req.params.id, "id");
  const itemId = parseIntParam(req.params.itemId, "itemId");
  const coll = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, collectionId), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (coll.length === 0) return res.status(404).json({ error: "Collection not found" });

  const patch: { caption?: string | null; sortOrder?: number } = {};
  if ("caption" in req.body) patch.caption = typeof req.body.caption === "string" ? req.body.caption : null;
  if ("sortOrder" in req.body && typeof req.body.sortOrder === "number") patch.sortOrder = req.body.sortOrder;

  const updated = await db
    .update(collectionItemsTable)
    .set(patch)
    .where(and(eq(collectionItemsTable.id, itemId), eq(collectionItemsTable.collectionId, collectionId)))
    .returning();
  if (updated.length === 0) return res.status(404).json({ error: "Item not found" });
  return res.json(updated[0]);
});

// DELETE /memory-collections/:id/items/:itemId
router.delete("/memory-collections/:id/items/:itemId", async (req, res) => {
  const collectionId = parseIntParam(req.params.id, "id");
  const itemId = parseIntParam(req.params.itemId, "itemId");
  const coll = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, collectionId), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (coll.length === 0) return res.status(404).json({ error: "Collection not found" });
  await db
    .delete(collectionItemsTable)
    .where(and(eq(collectionItemsTable.id, itemId), eq(collectionItemsTable.collectionId, collectionId)));
  return res.json({ success: true });
});

// POST /memory-collections/:id/items/reorder — bulk sortOrder update
router.post("/memory-collections/:id/items/reorder", async (req, res) => {
  const collectionId = parseIntParam(req.params.id, "id");
  const coll = await db
    .select()
    .from(memoryCollectionsTable)
    .where(and(eq(memoryCollectionsTable.id, collectionId), eq(memoryCollectionsTable.userId, getUserId(req))))
    .limit(1);
  if (coll.length === 0) return res.status(404).json({ error: "Collection not found" });

  const raw = req.body.orderedIds;
  if (!Array.isArray(raw) || !raw.every((v: unknown) => typeof v === "number" && Number.isInteger(v))) {
    return res.status(400).json({ error: "orderedIds must be an array of integers" });
  }
  const orderedIds: number[] = raw;

  await Promise.all(
    orderedIds.map((id: number, index: number) =>
      db
        .update(collectionItemsTable)
        .set({ sortOrder: index })
        .where(and(eq(collectionItemsTable.id, id), eq(collectionItemsTable.collectionId, collectionId)))
    )
  );
  return res.json({ success: true });
});

export default router;
