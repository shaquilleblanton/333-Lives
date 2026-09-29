import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const VAULT_CATEGORIES = [
  "document",
  "photo",
  "journal",
  "voice_note",
  "important_info",
  // Estate / Final Wishes categories
  "final_letter",
  "will",
  "insurance",
  "medical_directive",
  "funeral_wishes",
  "digital_assets",
] as const;

export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

export const VAULT_VISIBILITY = ["private", "family"] as const;
export type VaultVisibility = (typeof VAULT_VISIBILITY)[number];

export const vaultItemsTable = pgTable("vault_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: VAULT_CATEGORIES }).notNull(),
  visibility: text("visibility", { enum: VAULT_VISIBILITY }).notNull().default("private"),
  fileUrl: text("file_url"),
  content: text("content"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultItemSchema = createInsertSchema(vaultItemsTable).omit({ id: true, createdAt: true });
export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;
export type VaultItem = typeof vaultItemsTable.$inferSelect;

// ── Family Links ──────────────────────────────────────────────────────────────
// Bidirectional cross-user linking. An invite starts with invitee_id = NULL;
// accepting the invite sets invitee_id and accepted_at.
export const familyLinksTable = pgTable("family_links", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  inviteeId: integer("invitee_id").references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FamilyLink = typeof familyLinksTable.$inferSelect;

// Persistent failed-token throttling shared by all API server instances.
export const familyInviteAttemptTable = pgTable(
  "family_invite_attempts",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
  },
  (table) => [index("family_invite_attempts_window_started_idx").on(table.windowStartedAt)],
);

// ── Trusted Contacts (for Estate Vault access after death) ───────────────────
export const VAULT_CONTACT_TYPES = ["person", "attorney", "executor"] as const;
export type VaultContactType = (typeof VAULT_CONTACT_TYPES)[number];

export const vaultContactsTable = pgTable("vault_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull(), // 1 = first contact, 2 = second contact
  type: text("type", { enum: VAULT_CONTACT_TYPES }).notNull().default("person"),
  name: text("name").notNull(),
  relationship: text("relationship"), // e.g. "Spouse", "Sibling", "Attorney"
  email: text("email").notNull(),
  phone: text("phone"),
  firmName: text("firm_name"),   // for attorneys / law firms
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultContactSchema = createInsertSchema(vaultContactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateVaultContactSchema = insertVaultContactSchema.partial().omit({ userId: true });
export type InsertVaultContact = z.infer<typeof insertVaultContactSchema>;
export type VaultContact = typeof vaultContactsTable.$inferSelect;
