import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Legacy table from the removed in-app Shop (Aug 2026). No code reads or writes
 * it, but it still exists in the production database. Keeping the definition
 * here stops schema publishes from treating it as "removed" and asking to drop
 * or rename it. Safe to delete later together with a deliberate drop migration.
 */
export const shopReferralClicksTable = pgTable("shop_referral_clicks", {
  id:           serial("id").primaryKey(),
  productId:    text("product_id").notNull(),
  productName:  text("product_name").notNull(),
  referralCode: text("referral_code").notNull().default("333lives"),
  clickedAt:    timestamp("clicked_at").notNull().defaultNow(),
});
