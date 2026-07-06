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

/**
 * The offset (in ms) of `timeZone` from UTC at the given instant, i.e.
 * (wall-clock time in timeZone) - (UTC time). Positive east of UTC.
 */
function getTimezoneOffsetMs(utcTime: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcTime));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - utcTime;
}

/**
 * Convert a wall-clock date/time in `timeZone` to the corresponding UTC
 * instant. Uses a two-pass offset lookup so it stays correct across DST
 * boundaries.
 */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = getTimezoneOffsetMs(guess, timeZone);
  const offset2 = getTimezoneOffsetMs(guess - offset1, timeZone);
  return new Date(guess - offset2);
}

/**
 * The UTC instants bounding the user's local calendar day (the day
 * returned by {@link getTodayDate}). Use these to filter timestamp
 * columns so an evening user in the Americas sees their local "today"
 * rather than UTC's "tomorrow".
 */
export function getLocalDayRange(req?: Request): { startOfDay: Date; endOfDay: Date } {
  const timeZone = getTimezone(req);
  const today = getTodayDate(req);
  const [year, month, day] = today.split("-").map(Number);
  const startOfDay = zonedWallTimeToUtc(year, month, day, 0, 0, 0, 0, timeZone);
  const endOfDay = zonedWallTimeToUtc(year, month, day, 23, 59, 59, 999, timeZone);
  return { startOfDay, endOfDay };
}
