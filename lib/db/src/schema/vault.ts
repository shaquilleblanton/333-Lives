import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
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

export const vaultItemsTable = pgTable("vault_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: VAULT_CATEGORIES }).notNull(),
  fileUrl: text("file_url"),
  content: text("content"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultItemSchema = createInsertSchema(vaultItemsTable).omit({ id: true, createdAt: true });
export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;
export type VaultItem = typeof vaultItemsTable.$inferSelect;

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
