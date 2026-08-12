import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const shopReferralClicksTable = pgTable("shop_referral_clicks", {
  id:           serial("id").primaryKey(),
  productId:    text("product_id").notNull(),
  productName:  text("product_name").notNull(),
  referralCode: text("referral_code").notNull().default("333lives"),
  clickedAt:    timestamp("clicked_at").notNull().defaultNow(),
});
