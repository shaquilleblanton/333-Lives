import { describe, expect, it } from "vitest";
import { habitStreaks } from "./habit-streaks";

describe("Habit streaks shown on Today", () => {
  it("counts consecutive days, not total historical check-ins", () => {
    expect(habitStreaks(["2026-10-01", "2026-10-03", "2026-10-09", "2026-10-10"], "2026-10-10"))
      .toEqual({ currentStreak: 2, longestStreak: 2 });
  });
  it("keeps yesterday's streak until the user can check in today", () => {
    expect(habitStreaks(["2026-10-08", "2026-10-09"], "2026-10-10").currentStreak).toBe(2);
  });
  it("resets after a missed day while preserving the longest run", () => {
    expect(habitStreaks(["2026-10-07", "2026-10-08"], "2026-10-10"))
      .toEqual({ currentStreak: 0, longestStreak: 2 });
  });
  it("handles leap days, duplicates, and unordered check-ins", () => {
    expect(habitStreaks(["2028-03-01", "2028-02-28", "2028-02-29", "2028-02-29"], "2028-03-01"))
      .toEqual({ currentStreak: 3, longestStreak: 3 });
  });
  it("does not count future dates", () => {
    expect(habitStreaks(["2026-10-11"], "2026-10-10"))
      .toEqual({ currentStreak: 0, longestStreak: 0 });
  });
});
