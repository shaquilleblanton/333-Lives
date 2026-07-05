import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", { enum: ["personal", "financial", "health", "relationships", "career", "spiritual"] }).notNull().default("personal"),
  progress: integer("progress").notNull().default(0),
  targetDate: date("target_date"),
  isCompleted: boolean("is_completed").notNull().default(false),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, isCompleted: true });
export const updateGoalSchema = insertGoalSchema.partial().extend({ isCompleted: z.boolean().optional() });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
