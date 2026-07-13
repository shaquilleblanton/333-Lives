import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const LIFE_EVENT_CATEGORIES = [
  "education",
  "career",
  "family",
  "health",
  "home",
  "travel",
  "loss",
  "achievement",
  "relationship",
  "spiritual",
  "other",
] as const;
export type LifeEventCategory = (typeof LIFE_EVENT_CATEGORIES)[number];

export const MediaAttachmentSchema = z.object({
  type: z.enum(["photo", "voice", "doc"]),
  objectPath: z.string().startsWith("/objects/"),
  name: z.string().max(200),
});
export type MediaAttachment = z.infer<typeof MediaAttachmentSchema>;

export const lifeEventsTable = pgTable("life_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  approximateDate: boolean("approximate_date").notNull().default(false),
  category: text("category").notNull().$type<LifeEventCategory>(),
  description: text("description"),
  mediaUrls: jsonb("media_urls").$type<MediaAttachment[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const createLifeEventSchema = createInsertSchema(lifeEventsTable)
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .extend({
    category: z.enum(LIFE_EVENT_CATEGORIES),
    mediaUrls: z.array(MediaAttachmentSchema).max(10).optional().default([]),
  });

export const updateLifeEventSchema = createLifeEventSchema.partial();
export type CreateLifeEvent = z.infer<typeof createLifeEventSchema>;
export type LifeEvent = typeof lifeEventsTable.$inferSelect;
