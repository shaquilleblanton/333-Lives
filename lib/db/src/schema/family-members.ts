import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const FAMILY_RELATIONS = [
  "parent",
  "child",
  "sibling",
  "grandparent",
  "grandchild",
  "aunt_uncle",
  "cousin",
  "ancestor",
  "chosen_family",
  "other",
] as const;

export const familyMembersTable = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relation: text("relation", { enum: FAMILY_RELATIONS }).notNull().default("other"),
  birthDate: date("birth_date"),
  deathDate: date("death_date"),
  birthplace: text("birthplace"),
  affiliation: text("affiliation"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembersTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().trim().min(1).max(200),
    birthDate: z.string().nullable().optional(),
    deathDate: z.string().nullable().optional(),
    birthplace: z.string().trim().max(300).nullable().optional(),
    affiliation: z.string().trim().max(500).nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  });
export const updateFamilyMemberSchema = insertFamilyMemberSchema.partial();
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembersTable.$inferSelect;

export const familyMemberMomentsTable = pgTable("family_member_moments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => familyMembersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: text("type", {
    enum: ["conversation", "promise", "milestone", "memory", "birthday", "loss", "gratitude", "other"],
  }).notNull().default("memory"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFamilyMemberMomentSchema = createInsertSchema(familyMemberMomentsTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    date: z.string(),
    title: z.string().trim().min(1).max(300),
    description: z.string().nullable().optional(),
  });
export const updateFamilyMemberMomentSchema = insertFamilyMemberMomentSchema.partial();
export type InsertFamilyMemberMoment = z.infer<typeof insertFamilyMemberMomentSchema>;
export type FamilyMemberMoment = typeof familyMemberMomentsTable.$inferSelect;
