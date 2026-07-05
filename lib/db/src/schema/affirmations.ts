import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const affirmationsTable = pgTable("affirmations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  date: date("date").notNull(),
  isFavorited: boolean("is_favorited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAffirmationSchema = createInsertSchema(affirmationsTable).omit({ id: true, createdAt: true });
export const updateAffirmationSchema = insertAffirmationSchema.partial();
export type InsertAffirmation = z.infer<typeof insertAffirmationSchema>;
export type Affirmation = typeof affirmationsTable.$inferSelect;
