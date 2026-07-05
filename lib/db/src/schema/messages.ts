import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  audioUrl: text("audio_url"),
  type: text("type", { enum: ["text", "audio", "video"] }).notNull().default("text"),
  unlockDate: timestamp("unlock_date").notNull(),
  isUnlocked: boolean("is_unlocked").notNull().default(false),
  recipientName: text("recipient_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export const updateMessageSchema = insertMessageSchema.partial();
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
