import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * pulse_circle_members — explicit circle membership for the Pulse feed.
 *
 * Each row means "userId has memberUserId in their circle."
 * In 333 Lives (a closed, invite-only family app), new users are
 * auto-added to all existing circles and vice-versa — so the circle
 * always equals all app users. The table gives the owner fine-grained
 * control (e.g. temporarily muting someone) without changing the API.
 */
export const pulseCircleMembersTable = pgTable(
  "pulse_circle_members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    memberUserId: integer("member_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("pulse_circle_unique").on(t.userId, t.memberUserId)],
);

export const PULSE_POST_TYPES = ["text", "photo", "voice"] as const;
export type PulsePostType = (typeof PULSE_POST_TYPES)[number];

export const PULSE_REACTION_TYPES = ["fire", "pray", "love", "strength"] as const;
export type PulseReactionType = (typeof PULSE_REACTION_TYPES)[number];

export const pulsePostsTable = pgTable("pulse_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrl: text("media_url"),
  type: text("type", { enum: ["text", "photo", "voice"] })
    .notNull()
    .$type<PulsePostType>(),
  isPersistent: boolean("is_persistent").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pulseReactionsTable = pgTable(
  "pulse_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => pulsePostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["fire", "pray", "love", "strength"] })
      .notNull()
      .$type<PulseReactionType>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("pulse_reactions_post_user_unique").on(t.postId, t.userId)],
);

export const insertPulsePostSchema = createInsertSchema(pulsePostsTable)
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .extend({
    type: z.enum(PULSE_POST_TYPES),
    content: z.string().max(280).optional().nullable(),
    mediaUrl: z.string().startsWith("/objects/").optional().nullable(),
    isPersistent: z.boolean().optional().default(false),
  });

export type InsertPulsePost = z.infer<typeof insertPulsePostSchema>;
export type PulsePost = typeof pulsePostsTable.$inferSelect;
export type PulseReaction = typeof pulseReactionsTable.$inferSelect;
