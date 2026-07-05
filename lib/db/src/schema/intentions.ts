import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const intentionsTable = pgTable("intentions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  date: date("date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIntentionSchema = createInsertSchema(intentionsTable).omit({ id: true, createdAt: true, isCompleted: true });
export const updateIntentionSchema = insertIntentionSchema.partial().extend({ isCompleted: z.boolean().optional() });
export type InsertIntention = z.infer<typeof insertIntentionSchema>;
export type Intention = typeof intentionsTable.$inferSelect;
