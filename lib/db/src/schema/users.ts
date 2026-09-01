import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  isOwner: boolean("is_owner").notNull().default(false),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  streakDays: integer("streak_days").notNull().default(0),
  celebrationLastRecord: integer("celebration_last_record"),
  celebrationLastMilestone: integer("celebration_last_milestone"),
  messagesSent: integer("messages_sent").notNull().default(0),
  goalsActive: integer("goals_active").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A short-lived retry record for the rare case where local account data is
 * deleted but the external identity provider is temporarily unavailable.
 *
 * This deliberately has no foreign key to users: the user row has already
 * been removed when this record is needed. It prevents a valid Clerk session
 * from silently provisioning a new local account while deletion is retried.
 */
export const accountDeletionsTable = pgTable("account_deletions", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  deletedUserId: integer("deleted_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const updateUserSchema = insertUserSchema.partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
