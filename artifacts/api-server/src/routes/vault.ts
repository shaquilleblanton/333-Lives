import express, { Router } from "express";
import { parseIntParam } from "../lib/params";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  vaultItemsTable,
  insertVaultItemSchema,
  vaultContactsTable,
  insertVaultContactSchema,
  updateVaultContactSchema,
  familyLinksTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { encryptBuffer, decryptBuffer } from "../lib/vaultCrypto";
import { z } from "zod/v4";

const router = Router();
const objectStorageService = new ObjectStorageService();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Server-side access check for vault file downloads.
 * Owner always passes. A family member passes only when the item is 'family'-
 * visibility and an accepted link exists between the requester and the owner.
 */
async function canAccessVaultItem(
  requesterId: number,
  item: { userId: number; visibility: string | null },
): Promise<boolean> {
  if (item.userId === requesterId) return true;
  if (item.visibility !== "family") return false;
  const link = await db
    .select({ id: familyLinksTable.id })
    .from(familyLinksTable)
    .where(
      and(
        isNotNull(familyLinksTable.acceptedAt),
        or(
          and(
            eq(familyLinksTable.inviterId, requesterId),
            eq(familyLinksTable.inviteeId, item.userId),
          ),
          and(
            eq(familyLinksTable.inviteeId, requesterId),
            eq(familyLinksTable.inviterId, item.userId),
          ),
        ),
      ),
    )
    .limit(1);
  return link.length > 0;
}

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

// ── File upload (must appear before /vault/:id to avoid route conflict) ───────

/**
 * POST /vault/:id/upload
 * Accepts a raw binary body (application/octet-stream).
 * Encrypts with AES-256-GCM and stores in private object storage.
 * Requires X-Filename header.
 */
router.post(
  "/vault/:id/upload",
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req, res) => {
    const userId = getUserId(req);
    const id = parseIntParam(req.params.id, "id");

    // Verify ownership
    const rows = await db
      .select()
      .from(vaultItemsTable)
      .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, userId)))
      .limit(1);
    if (rows.length === 0) return res.status(404).json({ error: "Vault item not found" });

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: "No file body received" });
    }
    if (body.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "File is too large (maximum 50 MB)" });
    }

    const filename = (req.headers["x-filename"] as string | undefined) ?? "file";
    const mimeType =
      (req.headers["x-mime-type"] as string | undefined) ??
      (req.headers["content-type"] as string | undefined) ??
      "application/octet-stream";
    const allowedMime = /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[^;]+|rtf|json)|image\/(jpeg|png|gif|webp)|audio\/(mpeg|wav|ogg|webm|mp4)|video\/(mp4|webm|quicktime)|text\/plain)(;|$)/i;
    if (!allowedMime.test(mimeType)) return res.status(400).json({ error: "Unsupported file type" });
    if (!filename || filename.length > 200 || /[\u0000-\u001f\u007f]/.test(filename)) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    // Encrypt before storing — files in GCS are ciphertext-only
    const encrypted = encryptBuffer(body);
    const existing = rows[0];
    const oldFileUrl = existing.fileUrl ?? null;

    // ── Safe replacement sequence ────────────────────────────────────────────
    // 1. Upload new encrypted object first (old file still intact in storage)
    const filePath = await objectStorageService.saveVaultFile(
      userId,
      id,
      filename,
      encrypted,
      mimeType,
    );

    // 2. Update the database row to point at the new object
    let updated: typeof vaultItemsTable.$inferSelect[];
    try {
      updated = await db
        .update(vaultItemsTable)
        .set({ fileUrl: filePath, mimeType, sizeBytes: body.length })
        .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, userId)))
        .returning();
    } catch (dbErr) {
      // DB update failed — clean up the newly uploaded object so we don't
      // leave orphaned ciphertext in storage, then re-throw.
      await objectStorageService.deleteVaultFile(filePath, userId, id).catch((err) => req.log.warn({ err }, "Vault upload cleanup failed"));
      throw dbErr;
    }

    // 3. Only after a successful DB commit, best-effort delete the old object.
    //    A failure here leaves an orphan in storage but never loses user data.
    if (oldFileUrl) {
      objectStorageService.deleteVaultFile(oldFileUrl, userId, id).catch((err) => req.log.warn({ err }, "Vault replacement cleanup failed"));
    }

    return res.json(updated[0]);
  },
);

/**
 * GET /vault/:id/file
 * Downloads, decrypts, and streams the vault file to the authenticated user.
 * Access: owner always allowed; family members allowed only when visibility='family'.
 */
router.get("/vault/:id/file", async (req, res) => {
  const userId = getUserId(req);
  const id = parseIntParam(req.params.id, "id");

  const rows = await db
    .select()
    .from(vaultItemsTable)
    .where(eq(vaultItemsTable.id, id))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: "Vault item not found" });
  const item = rows[0];

  if (!(await canAccessVaultItem(userId, item))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!item.fileUrl) {
    return res.status(404).json({ error: "No file attached to this item" });
  }

  try {
    const { data: encrypted, originalContentType } = await objectStorageService.loadVaultFile(
      item.fileUrl, item.userId, item.id,
    );
    const plaintext = decryptBuffer(encrypted);

    const ct = item.mimeType ?? originalContentType ?? "application/octet-stream";
    const safeName = (item.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = ct.split("/")[1]?.split(";")[0]?.split("+")[0] ?? "bin";
    const downloadName = safeName.includes(".") ? safeName : `${safeName}.${ext}`;

    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader("Content-Length", String(plaintext.length));
    res.setHeader("Cache-Control", "private, no-store");
    return res.end(plaintext);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "File not found in storage" });
    }
    req.log.error({ err }, "Vault file decryption/download failed");
    return res.status(500).json({ error: "Failed to retrieve file" });
  }
});

router.get("/vault/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
  const rows = await db
    .select()
    .from(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Vault item not found" });
  return res.json(rows[0]);
});

const updateVaultItemSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["document", "photo", "journal", "voice_note", "important_info", "final_letter", "will", "insurance", "medical_directive", "funeral_wishes", "digital_assets"]).optional(),
  visibility: z.enum(["private", "family"]).optional(),
  content: z.string().nullable().optional(),
}).strict();

router.patch("/vault/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "id");
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
  const id = parseIntParam(req.params.id, "id");
  // Read the file URL before deletion so we can clean up storage afterward.
  const rows = await db
    .select({ fileUrl: vaultItemsTable.fileUrl })
    .from(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))))
    .limit(1);

  // ── DB-first deletion sequence ────────────────────────────────────────────
  // Delete the database row FIRST. If the row delete fails, the encrypted
  // object in storage is untouched and the user's file remains retrievable.
  // Only after the row is committed do we best-effort delete the storage blob.
  // An orphaned ciphertext in storage is preferable to a missing file that
  // the database still advertises.
  await db
    .delete(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.userId, getUserId(req))));

  // Best-effort: clean up the encrypted blob from GCS.
  if (rows[0]?.fileUrl) {
    objectStorageService.deleteVaultFile(rows[0].fileUrl, getUserId(req), id).catch((err) => req.log.warn({ err }, "Vault deletion cleanup failed"));
  }

  return res.json({ success: true });
});

// ── Family Vault — shared items from linked members ───────────────────────────

/**
 * GET /vault/family/items
 * Returns all 'family'-visibility items belonging to accepted family members.
 * Includes owner display name for rendering.
 */
router.get("/vault/family/items", async (req, res) => {
  const userId = getUserId(req);

  // Get IDs of all accepted family members
  const links = await db
    .select({
      inviterId: familyLinksTable.inviterId,
      inviteeId: familyLinksTable.inviteeId,
    })
    .from(familyLinksTable)
    .where(
      and(
        isNotNull(familyLinksTable.acceptedAt),
        or(
          eq(familyLinksTable.inviterId, userId),
          eq(familyLinksTable.inviteeId, userId),
        ),
      ),
    );

  const memberIds = links.flatMap((l) => {
    const other = l.inviterId === userId ? l.inviteeId : l.inviterId;
    return other !== null ? [other] : [];
  });

  if (memberIds.length === 0) return res.json([]);

  // Fetch family-visible items from those members
  const items = await db
    .select({
      id: vaultItemsTable.id,
      userId: vaultItemsTable.userId,
      name: vaultItemsTable.name,
      category: vaultItemsTable.category,
      visibility: vaultItemsTable.visibility,
      mimeType: vaultItemsTable.mimeType,
      sizeBytes: vaultItemsTable.sizeBytes,
      createdAt: vaultItemsTable.createdAt,
      ownerName: usersTable.name,
    })
    .from(vaultItemsTable)
    .innerJoin(usersTable, eq(usersTable.id, vaultItemsTable.userId))
    .where(
      and(
        eq(vaultItemsTable.visibility, "family"),
        // drizzle inArray requires at least one value — already guarded above
        or(...memberIds.map((id) => eq(vaultItemsTable.userId, id))),
      ),
    );

  return res.json(items);
});

// ── Family Links ──────────────────────────────────────────────────────────────

/**
 * GET /vault/family/members
 * Returns all accepted family members linked to the requesting user.
 */
router.get("/vault/family/members", async (req, res) => {
  const userId = getUserId(req);

  const links = await db
    .select({
      id: familyLinksTable.id,
      inviterId: familyLinksTable.inviterId,
      inviteeId: familyLinksTable.inviteeId,
      acceptedAt: familyLinksTable.acceptedAt,
      createdAt: familyLinksTable.createdAt,
    })
    .from(familyLinksTable)
    .where(
      and(
        isNotNull(familyLinksTable.acceptedAt),
        or(
          eq(familyLinksTable.inviterId, userId),
          eq(familyLinksTable.inviteeId, userId),
        ),
      ),
    );

  // Fetch display names for the other side of each link
  const results = await Promise.all(
    links.map(async (link) => {
      const otherId = link.inviterId === userId ? link.inviteeId! : link.inviterId;
      const user = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, otherId))
        .limit(1);
      return {
        linkId: link.id,
        userId: otherId,
        name: user[0]?.name ?? "Unknown",
        linkedAt: link.acceptedAt,
      };
    }),
  );

  return res.json(results);
});

/**
 * POST /vault/family/invite
 * Generates a new invite token. The token can be shared with a family member.
 */
router.post("/vault/family/invite", async (req, res) => {
  const userId = getUserId(req);
  const token = randomUUID();
  const inserted = await db
    .insert(familyLinksTable)
    .values({ inviterId: userId, token })
    .returning();
  return res.status(201).json({ token: inserted[0].token, createdAt: inserted[0].createdAt });
});

/**
 * POST /vault/family/invite/:token/accept
 * Accepts a family invite. Sets invitee_id and accepted_at.
 */
router.post("/vault/family/invite/:token/accept", async (req, res) => {
  const userId = getUserId(req);
  const { token } = req.params;

  const links = await db
    .select()
    .from(familyLinksTable)
    .where(eq(familyLinksTable.token, token))
    .limit(1);

  if (links.length === 0) return res.status(404).json({ error: "Invite not found or expired" });
  const link = links[0];

  if (link.acceptedAt) return res.status(409).json({ error: "Invite already accepted" });
  if (link.inviterId === userId) return res.status(400).json({ error: "Cannot accept your own invite" });

  // Check for existing link between these two users
  const existing = await db
    .select({ id: familyLinksTable.id })
    .from(familyLinksTable)
    .where(
      and(
        isNotNull(familyLinksTable.acceptedAt),
        or(
          and(eq(familyLinksTable.inviterId, link.inviterId), eq(familyLinksTable.inviteeId, userId)),
          and(eq(familyLinksTable.inviteeId, link.inviterId), eq(familyLinksTable.inviterId, userId)),
        ),
      ),
    )
    .limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Already linked with this user" });

  const updated = await db
    .update(familyLinksTable)
    .set({ inviteeId: userId, acceptedAt: new Date() })
    .where(eq(familyLinksTable.token, token))
    .returning();

  return res.json({ success: true, linkedAt: updated[0].acceptedAt });
});

/**
 * DELETE /vault/family/members/:linkId
 * Removes a family link (unlinks). Both sides can remove.
 */
router.delete("/vault/family/members/:linkId", async (req, res) => {
  const userId = getUserId(req);
  const linkId = parseIntParam(req.params.linkId, "linkId");

  await db
    .delete(familyLinksTable)
    .where(
      and(
        eq(familyLinksTable.id, linkId),
        or(
          eq(familyLinksTable.inviterId, userId),
          eq(familyLinksTable.inviteeId, userId),
        ),
      ),
    );

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
  const id = parseIntParam(req.params.id, "id");
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
  const id = parseIntParam(req.params.id, "id");
  await db
    .delete(vaultContactsTable)
    .where(and(eq(vaultContactsTable.id, id), eq(vaultContactsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
