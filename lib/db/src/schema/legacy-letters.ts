import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const legacyLettersTable = pgTable("legacy_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientRelation: text("recipient_relation"),
  triggerType: text("trigger_type", {
    enum: ["date", "milestone", "manual", "if_gone"],
  }).notNull().default("date"),
  triggerDate: date("trigger_date"),
  milestone: text("milestone"),
  status: text("status", {
    enum: ["draft", "sealed", "delivered"],
  }).notNull().default("draft"),
  isSealed: boolean("is_sealed").notNull().default(false),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLegacyLetterSchema = createInsertSchema(legacyLettersTable).omit({ id: true, createdAt: true, updatedAt: true, deliveredAt: true });
export const updateLegacyLetterSchema = insertLegacyLetterSchema.partial();
export type InsertLegacyLetter = z.infer<typeof insertLegacyLetterSchema>;
export type LegacyLetter = typeof legacyLettersTable.$inferSelect;
