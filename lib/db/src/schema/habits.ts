import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  targetDays: integer("target_days").notNull().default(7),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalCheckins: integer("total_checkins").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitCheckinsTable = pgTable("habit_checkins", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habitsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status", { enum: ["great", "okay", "struggling"] }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true, currentStreak: true, longestStreak: true, totalCheckins: true });
export const updateHabitSchema = insertHabitSchema.partial();
export const insertHabitCheckinSchema = createInsertSchema(habitCheckinsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;
export type HabitCheckin = typeof habitCheckinsTable.$inferSelect;
