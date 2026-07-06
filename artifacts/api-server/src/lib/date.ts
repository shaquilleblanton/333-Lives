import type { Request } from "express";

/**
 * Header the client sends carrying its IANA timezone name
 * (e.g. "America/New_York"). Used to compute the user's local
 * calendar "today" instead of relying on the server's UTC clock.
 */
export const TIMEZONE_HEADER = "x-timezone";

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the timezone for a request, falling back to UTC when the
 * client did not send a valid `x-timezone` header.
 */
export function getTimezone(req?: Request): string {
  const header = req?.header(TIMEZONE_HEADER);
  if (header && isValidTimezone(header)) return header;
  return "UTC";
}

/**
 * The current calendar date (YYYY-MM-DD) in the user's local timezone.
 *
 * The whole app keys day-scoped data (intentions, habit check-ins,
 * gratitude, journal, affirmations) off this string, so it must reflect
 * the user's local day rather than the server's UTC day — otherwise an
 * evening entry in the Americas lands on "tomorrow".
 */
export function getTodayDate(req?: Request): string {
  const timeZone = getTimezone(req);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}
