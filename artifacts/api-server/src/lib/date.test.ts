import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMEZONE_HEADER, getTimezone, getTodayDate, getLocalDayRange } from "./date";

/**
 * Build a minimal mock Express request carrying only the timezone header,
 * which is all the date helpers read. Passing `undefined` produces a request
 * with no header, exercising the UTC fallback path.
 */
function mockReq(timeZone?: string): Request {
  return {
    header(name: string): string | undefined {
      if (name === TIMEZONE_HEADER && timeZone !== undefined) return timeZone;
      return undefined;
    },
  } as unknown as Request;
}

/**
 * Format a UTC instant into the wall-clock string ("YYYY-MM-DD HH:mm:ss") that
 * it maps to in `timeZone`. Used to assert that the range boundaries land on
 * local midnight / the following midnight regardless of offset or DST.
 */
function wallClock(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const hour = m.hour === "24" ? "00" : m.hour;
  return `${m.year}-${m.month}-${m.day} ${hour}:${m.minute}:${m.second}`;
}

/** The calendar day after `ymd` (a "YYYY-MM-DD" string). */
function nextDay(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

describe("getTimezone", () => {
  it("returns the header timezone when valid", () => {
    expect(getTimezone(mockReq("America/New_York"))).toBe("America/New_York");
  });

  it("falls back to UTC when no header is present", () => {
    expect(getTimezone(mockReq())).toBe("UTC");
    expect(getTimezone(undefined)).toBe("UTC");
  });

  it("falls back to UTC when the header is not a valid IANA zone", () => {
    expect(getTimezone(mockReq("Not/AZone"))).toBe("UTC");
  });
});

describe("getTodayDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reflects the user's local day, not the server UTC day", () => {
    // 04:30 UTC on 2026-01-15: still Jan 14 in the Americas, already Jan 15
    // east of UTC. Winter, so no DST anywhere relevant here.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T04:30:00.000Z"));

    expect(getTodayDate(mockReq("UTC"))).toBe("2026-01-15");
    expect(getTodayDate(mockReq("America/New_York"))).toBe("2026-01-14"); // UTC-5 -> 23:30 prev day
    expect(getTodayDate(mockReq("Asia/Kolkata"))).toBe("2026-01-15"); // UTC+5:30 -> 10:00
    expect(getTodayDate(mockReq("Pacific/Kiritimati"))).toBe("2026-01-15"); // UTC+14 -> 18:30
  });

  it("rolls the far-east day forward before UTC ticks over", () => {
    // 23:00 UTC on 2026-06-30: Kiritimati (UTC+14) is already on July 1.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T23:00:00.000Z"));

    expect(getTodayDate(mockReq("UTC"))).toBe("2026-06-30");
    expect(getTodayDate(mockReq("Pacific/Kiritimati"))).toBe("2026-07-01");
  });

  it("defaults to the UTC day when no timezone header is sent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T04:30:00.000Z"));
    expect(getTodayDate(mockReq())).toBe("2026-01-15");
  });
});

describe("getLocalDayRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const cases: Array<{ tz: string; now: string; expectedToday: string }> = [
    { tz: "UTC", now: "2026-01-15T12:00:00.000Z", expectedToday: "2026-01-15" },
    { tz: "America/New_York", now: "2026-01-15T04:30:00.000Z", expectedToday: "2026-01-14" },
    { tz: "Asia/Kolkata", now: "2026-01-15T04:30:00.000Z", expectedToday: "2026-01-15" },
    { tz: "Pacific/Kiritimati", now: "2026-06-30T23:00:00.000Z", expectedToday: "2026-07-01" },
  ];

  for (const { tz, now, expectedToday } of cases) {
    it(`brackets local midnight -> next midnight for ${tz}`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));

      const { startOfDay, endOfDay } = getLocalDayRange(mockReq(tz));

      // startOfDay is exactly local midnight of "today".
      expect(wallClock(startOfDay, tz)).toBe(`${expectedToday} 00:00:00`);

      // endOfDay is the last representable millisecond of the local day...
      expect(endOfDay.getMilliseconds()).toBe(999);
      expect(wallClock(endOfDay, tz)).toBe(`${expectedToday} 23:59:59`);

      // ...and one millisecond later is the following local midnight.
      const justAfter = new Date(endOfDay.getTime() + 1);
      expect(wallClock(justAfter, tz)).toBe(`${nextDay(expectedToday)} 00:00:00`);

      // Sanity: the window is a hair under 24h and strictly ordered.
      expect(endOfDay.getTime()).toBeGreaterThan(startOfDay.getTime());
    });
  }

  it("handles a spring-forward DST day (America/New_York, 23h day)", () => {
    // 2026-03-08: clocks jump 02:00 EST -> 03:00 EDT. The local day is 23h.
    // Pick an afternoon instant so "today" is unambiguously 2026-03-08.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T18:00:00.000Z"));

    const tz = "America/New_York";
    const { startOfDay, endOfDay } = getLocalDayRange(mockReq(tz));

    expect(wallClock(startOfDay, tz)).toBe("2026-03-08 00:00:00");
    expect(wallClock(endOfDay, tz)).toBe("2026-03-08 23:59:59");
    expect(wallClock(new Date(endOfDay.getTime() + 1), tz)).toBe("2026-03-09 00:00:00");

    // The offset changed mid-day: start is EST (UTC-5), end is EDT (UTC-4),
    // so the elapsed window is 23h (minus 1ms), proving the two-pass offset
    // lookup picked the correct offset at each boundary.
    const spanMs = endOfDay.getTime() - startOfDay.getTime();
    expect(spanMs).toBe(23 * 60 * 60 * 1000 - 1);
  });

  it("handles a fall-back DST day (America/New_York, 25h day)", () => {
    // 2026-11-01: clocks fall 02:00 EDT -> 01:00 EST. The local day is 25h.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));

    const tz = "America/New_York";
    const { startOfDay, endOfDay } = getLocalDayRange(mockReq(tz));

    expect(wallClock(startOfDay, tz)).toBe("2026-11-01 00:00:00");
    expect(wallClock(endOfDay, tz)).toBe("2026-11-01 23:59:59");
    expect(wallClock(new Date(endOfDay.getTime() + 1), tz)).toBe("2026-11-02 00:00:00");

    const spanMs = endOfDay.getTime() - startOfDay.getTime();
    expect(spanMs).toBe(25 * 60 * 60 * 1000 - 1);
  });

  it("keeps a fractional (half-hour) offset zone aligned to local midnight", () => {
    // Asia/Kolkata is UTC+5:30 year-round; a naive hour-only offset would be
    // 30 minutes off. Midnight IST = 18:30 UTC the previous day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T04:30:00.000Z"));

    const tz = "Asia/Kolkata";
    const { startOfDay } = getLocalDayRange(mockReq(tz));

    expect(wallClock(startOfDay, tz)).toBe("2026-01-15 00:00:00");
    expect(startOfDay.toISOString()).toBe("2026-01-14T18:30:00.000Z");
  });
});
