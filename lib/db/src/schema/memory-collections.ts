import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { peopleTable } from "./people";

export const memoryCollectionsTable = pgTable("memory_collections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  personId: integer("person_id").references(() => peopleTable.id, { onDelete: "set null" }),
  isInMemory: boolean("is_in_memory").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const collectionItemsTable = pgTable("collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => memoryCollectionsTable.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  type: text("type", { enum: ["photo", "voice"] }).notNull().default("photo"),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemoryCollectionSchema = createInsertSchema(memoryCollectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemoryCollection = z.infer<typeof insertMemoryCollectionSchema>;
export type MemoryCollection = typeof memoryCollectionsTable.$inferSelect;

export const insertCollectionItemSchema = createInsertSchema(collectionItemsTable).omit({ id: true, createdAt: true });
export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;
export type CollectionItem = typeof collectionItemsTable.$inferSelect;
