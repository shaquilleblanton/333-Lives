import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPersonSchema = createInsertSchema(peopleTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updatePersonSchema = insertPersonSchema.partial();
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof peopleTable.$inferSelect;
