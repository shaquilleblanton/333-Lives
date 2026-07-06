import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { peopleTable } from "./people";

export const relationshipMomentsTable = pgTable("relationship_moments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: text("type", {
    enum: ["conversation", "promise", "milestone", "memory", "birthday", "loss", "gratitude", "other"],
  }).notNull().default("memory"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRelationshipMomentSchema = createInsertSchema(relationshipMomentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateRelationshipMomentSchema = insertRelationshipMomentSchema.partial();
export type InsertRelationshipMoment = z.infer<typeof insertRelationshipMomentSchema>;
export type RelationshipMoment = typeof relationshipMomentsTable.$inferSelect;
