import { pgTable, serial, text, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const gratitudeEntriesTable = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  item1: text("item1").notNull(),
  item2: text("item2"),
  item3: text("item3"),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGratitudeEntrySchema = createInsertSchema(gratitudeEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateGratitudeEntrySchema = insertGratitudeEntrySchema.partial();
export type InsertGratitudeEntry = z.infer<typeof insertGratitudeEntrySchema>;
export type GratitudeEntry = typeof gratitudeEntriesTable.$inferSelect;
