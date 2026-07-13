import { pgTable, serial, text, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const peopleTable = pgTable("people", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relationship: text("relationship", {
    enum: ["family", "friend", "partner", "mentor", "colleague", "other"],
  }).notNull().default("other"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  birthday: date("birthday"),
  lostDate: date("lost_date"),
  note: text("note"),
  /**
   * linkedUserId — links this People entry to an actual app user account.
   * When set alongside isCircle=true, that user appears in the Pulse feed circle.
   * The owner links entries by calling PATCH /people/:id with { linkedUserId }.
   */
  linkedUserId: integer("linked_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  /**
   * isCircle — true when this person is in the current user's Pulse circle.
   * Only meaningful when linkedUserId is set.
   */
  isCircle: boolean("is_circle").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPersonSchema = createInsertSchema(peopleTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updatePersonSchema = insertPersonSchema.partial();
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof peopleTable.$inferSelect;
