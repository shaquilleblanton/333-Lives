import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const voiceMemosTable = pgTable("voice_memos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  objectPath: text("object_path").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVoiceMemoSchema = createInsertSchema(voiceMemosTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateVoiceMemoSchema = insertVoiceMemoSchema.partial();
export type InsertVoiceMemo = z.infer<typeof insertVoiceMemoSchema>;
export type VoiceMemo = typeof voiceMemosTable.$inferSelect;
