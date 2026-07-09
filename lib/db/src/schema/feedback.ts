import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const FEEDBACK_TYPES = ["feature", "improvement", "bug"] as const;
export const FEEDBACK_STATUSES = ["new", "planned", "done", "declined"] as const;

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: FEEDBACK_TYPES }).notNull(),
  title: text("title").notNull(),
  details: text("details").notNull(),
  appArea: text("app_area"),
  status: text("status", { enum: FEEDBACK_STATUSES }).notNull().default("new"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable)
  .omit({ id: true, userId: true, status: true, adminNote: true, createdAt: true, updatedAt: true })
  .extend({
    title: z.string().trim().min(1).max(200),
    details: z.string().trim().min(1).max(5000),
    appArea: z.string().trim().max(100).optional().nullable(),
  });
export const updateFeedbackAdminSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  adminNote: z.string().trim().max(5000).nullable().optional(),
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
