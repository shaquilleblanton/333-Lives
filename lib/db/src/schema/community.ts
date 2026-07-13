import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const communityCalendarTable = pgTable("community_calendar", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["graduation", "cookout", "reunion", "sporting_event", "birthday", "wedding", "open_day", "request", "other"],
  }).notNull().default("other"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  windowType: text("window_type", {
    enum: ["open", "locked", "scheduled", "private"],
  }).notNull().default("scheduled"),
  isOpenDay: boolean("is_open_day").notNull().default(false),
  status: text("status", { enum: ["open", "confirmed", "pending", "declined"] }).notNull().default("open"),
  requestedBy: text("requested_by"),
  isPublic: boolean("is_public").notNull().default(true),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// isOpenDay and isPublic are deprecated legacy fields — omitted from external
// schema validation and derived internally from windowType on every write.
export const insertCommunityEventSchema = createInsertSchema(communityCalendarTable)
  .omit({ id: true, createdAt: true, updatedAt: true, isOpenDay: true, isPublic: true });
export const updateCommunityEventSchema = insertCommunityEventSchema.partial();
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;
export type CommunityEvent = typeof communityCalendarTable.$inferSelect;
