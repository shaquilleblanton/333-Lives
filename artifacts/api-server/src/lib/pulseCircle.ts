import { db } from "@workspace/db";
import { usersTable, pulseCircleMembersTable } from "@workspace/db/schema";
import { ne, sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * seedPulseCircles — one-time startup backfill.
 *
 * Inserts bidirectional pulse_circle_members rows for every pair of existing
 * users that doesn't already have one. Runs at server startup so that users
 * who were provisioned before this feature existed automatically become part
 * of each other's circles. ON CONFLICT DO NOTHING makes this idempotent.
 *
 * This is NOT a runtime fallback — it runs once at boot and is a no-op after
 * all rows are present.
 */
export async function seedPulseCircles(): Promise<void> {
  try {
    const result = await db.execute(sql`
      INSERT INTO pulse_circle_members (user_id, member_user_id)
      SELECT a.id, b.id
      FROM users a
      CROSS JOIN users b
      WHERE a.id <> b.id
      ON CONFLICT (user_id, member_user_id) DO NOTHING
    `);
    const seeded = (result as { rowCount?: number }).rowCount ?? 0;
    if (seeded > 0) {
      logger.info({ seeded }, "pulse circles backfilled at startup");
    }
  } catch (err) {
    // Non-fatal: log and continue. Missing circles just mean the user only sees
    // their own posts until the next successful startup.
    logger.error({ err }, "pulse circle seeding failed at startup");
  }
}
