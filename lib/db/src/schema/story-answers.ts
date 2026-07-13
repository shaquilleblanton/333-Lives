import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const storyAnswersTable = pgTable(
  "story_answers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id").notNull(),
    promptId: text("prompt_id").notNull(),
    textAnswer: text("text_answer"),
    audioUrl: text("audio_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.chapterId, table.promptId)],
);

export const upsertStoryAnswerSchema = createInsertSchema(storyAnswersTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    textAnswer: z.string().trim().max(10000).nullable().optional(),
    audioUrl: z.string().nullable().optional(),
  });
export const updateStoryAnswerSchema = upsertStoryAnswerSchema.partial();
export type UpsertStoryAnswer = z.infer<typeof upsertStoryAnswerSchema>;
export type StoryAnswer = typeof storyAnswersTable.$inferSelect;
