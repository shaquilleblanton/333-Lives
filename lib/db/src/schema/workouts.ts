import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workoutSessionsTable = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: date("date").notNull(),
  focus: text("focus", {
    enum: ["strength", "cardio", "mobility", "hiit", "recovery", "mixed"],
  }).notNull().default("mixed"),
  status: text("status", {
    enum: ["planned", "completed"],
  }).notNull().default("planned"),
  notes: text("notes"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workoutBlocksTable = pgTable("workout_blocks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessionsTable.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["exercise", "cardio", "break", "hydration"],
  }).notNull().default("exercise"),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull().default(0),
  position: integer("position").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateWorkoutSessionSchema = insertWorkoutSessionSchema.partial();

export const insertWorkoutBlockSchema = createInsertSchema(workoutBlocksTable).omit({ id: true, createdAt: true });
export const updateWorkoutBlockSchema = insertWorkoutBlockSchema.partial();

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessionsTable.$inferSelect;
export type InsertWorkoutBlock = z.infer<typeof insertWorkoutBlockSchema>;
export type WorkoutBlock = typeof workoutBlocksTable.$inferSelect;
