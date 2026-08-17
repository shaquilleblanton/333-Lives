import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const aiConversationsTable = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversationsTable).omit({
  id: true,
  createdAt: true,
});

export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
