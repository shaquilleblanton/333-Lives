import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const legacyLettersTable = pgTable("legacy_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  recipientName: text("recipient_name").notNull(),
  recipientRelation: text("recipient_relation"),
  mediaType: text("media_type", {
    enum: ["text", "voice", "video"],
  }).notNull().default("text"),
  mediaUrl: text("media_url"),
  mediaDurationSec: integer("media_duration_sec"),
  promptText: text("prompt_text"),
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

const baseLegacyLetterSchema = createInsertSchema(legacyLettersTable).omit({ id: true, createdAt: true, updatedAt: true, deliveredAt: true });

export const insertLegacyLetterSchema = baseLegacyLetterSchema.superRefine((data, ctx) => {
  const mediaType = data.mediaType ?? "text";
  if (mediaType === "text") {
    if (!data.content || data.content.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: ["content"], message: "Content is required for a written letter." });
    }
  } else if (!data.mediaUrl || data.mediaUrl.trim().length === 0) {
    ctx.addIssue({ code: "custom", path: ["mediaUrl"], message: "A recording is required for a voice or video message." });
  }
});

export const updateLegacyLetterSchema = baseLegacyLetterSchema.partial();
export type InsertLegacyLetter = z.infer<typeof insertLegacyLetterSchema>;
export type LegacyLetter = typeof legacyLettersTable.$inferSelect;
