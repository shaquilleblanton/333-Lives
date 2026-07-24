import { describe, it, expect } from "vitest";
import {
  highestMilestoneAtOrBelow,
  decideCelebration,
  STREAK_MILESTONES,
} from "./streak-celebrations";

// ─── highestMilestoneAtOrBelow ─────────────────────────────────────────────

describe("highestMilestoneAtOrBelow", () => {
  it("returns 0 below the first milestone", () => {
    expect(highestMilestoneAtOrBelow(0)).toBe(0);
    expect(highestMilestoneAtOrBelow(6)).toBe(0);
  });

  it("returns the exact milestone when the streak equals it", () => {
    for (const m of STREAK_MILESTONES) {
      expect(highestMilestoneAtOrBelow(m)).toBe(m);
    }
  });

  it("returns the lower milestone when between two thresholds", () => {
    expect(highestMilestoneAtOrBelow(8)).toBe(7);
    expect(highestMilestoneAtOrBelow(50)).toBe(30);
    expect(highestMilestoneAtOrBelow(200)).toBe(100);
  });

  it("returns the highest milestone for very large streaks", () => {
    expect(highestMilestoneAtOrBelow(365)).toBe(365);
    expect(highestMilestoneAtOrBelow(1000)).toBe(365);
  });
});

// ─── decideCelebration ────────────────────────────────────────────────────

describe("decideCelebration — baseline seeding (first observation)", () => {
  it("returns kind=baseline when both stored values are null", () => {
    const result = decideCelebration({
      currentStreak: 10,
      longestStreak: 10,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(result.kind).toBe("baseline");
  });

  it("seeds lastRecord from longestStreak, not currentStreak", () => {
    const result = decideCelebration({
      currentStreak: 5,
      longestStreak: 42,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(result.kind).toBe("baseline");
    expect(result.nextState.lastRecord).toBe(42);
  });

  it("seeds lastMilestone from highestMilestoneAtOrBelow(currentStreak)", () => {
    const result = decideCelebration({
      currentStreak: 35,
      longestStreak: 35,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(result.kind).toBe("baseline");
    // 35 is above 30 but below 100, so the milestone baseline should be 30
    expect(result.nextState.lastMilestone).toBe(30);
  });

  it("returns baseline when only lastRecord is null", () => {
    const result = decideCelebration({
      currentStreak: 10,
      longestStreak: 10,
      storedState: { lastRecord: null, lastMilestone: 7 },
    });
    expect(result.kind).toBe("baseline");
    // Existing lastMilestone is preserved when it's already initialised
    expect(result.nextState.lastMilestone).toBe(7);
  });

  it("returns baseline when only lastMilestone is null", () => {
    const result = decideCelebration({
      currentStreak: 10,
      longestStreak: 10,
      storedState: { lastRecord: 10, lastMilestone: null },
    });
    expect(result.kind).toBe("baseline");
    // Existing lastRecord is preserved
    expect(result.nextState.lastRecord).toBe(10);
  });

  it("does not fire a celebration on the first observation even on a record day", () => {
    const result = decideCelebration({
      currentStreak: 100,
      longestStreak: 100,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(result.kind).toBe("baseline");
  });
});

describe("decideCelebration — returning user with baselines already set", () => {
  it("returns kind=none when nothing has changed (reload scenario)", () => {
    const result = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: { lastRecord: 7, lastMilestone: 7 },
    });
    expect(result.kind).toBe("none");
  });

  it("returns kind=none when streak is below the next milestone and not a record", () => {
    const result = decideCelebration({
      currentStreak: 5,
      longestStreak: 20,
      storedState: { lastRecord: 20, lastMilestone: 0 },
    });
    expect(result.kind).toBe("none");
  });
});

describe("decideCelebration — new personal record", () => {
  it("fires kind=record when currentStreak grows past lastRecord", () => {
    const result = decideCelebration({
      currentStreak: 8,
      longestStreak: 8,
      storedState: { lastRecord: 7, lastMilestone: 7 },
    });
    expect(result.kind).toBe("record");
    expect(result.value).toBe(8);
  });

  it("advances lastRecord in nextState", () => {
    const result = decideCelebration({
      currentStreak: 8,
      longestStreak: 8,
      storedState: { lastRecord: 7, lastMilestone: 7 },
    });
    expect(result.nextState.lastRecord).toBe(8);
  });

  it("does not fire when currentStreak equals longestStreak but not greater than lastRecord", () => {
    // Same day reload: streak hasn't grown since we last celebrated it
    const result = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: { lastRecord: 7, lastMilestone: 7 },
    });
    expect(result.kind).toBe("none");
  });

  it("does not fire when currentStreak < longestStreak (not on a record run)", () => {
    const result = decideCelebration({
      currentStreak: 5,
      longestStreak: 10,
      storedState: { lastRecord: 10, lastMilestone: 7 },
    });
    expect(result.kind).toBe("none");
  });
});

describe("decideCelebration — milestone crossing", () => {
  it("fires kind=milestone when crossing the 7-day threshold (and it is not a new record)", () => {
    // longestStreak > currentStreak, so no record run — pure milestone fire
    const result = decideCelebration({
      currentStreak: 7,
      longestStreak: 20,
      storedState: { lastRecord: 20, lastMilestone: 0 },
    });
    expect(result.kind).toBe("milestone");
    expect(result.value).toBe(7);
  });

  it("advances lastMilestone in nextState", () => {
    const result = decideCelebration({
      currentStreak: 30,
      longestStreak: 30,
      storedState: { lastRecord: 29, lastMilestone: 7 },
    });
    // currentStreak === longestStreak AND currentStreak > lastRecord → record wins
    expect(result.kind).toBe("record");
    // But if we re-run with the streak now NOT a record…
    const result2 = decideCelebration({
      currentStreak: 30,
      longestStreak: 35, // a longer best already exists
      storedState: { lastRecord: 35, lastMilestone: 7 },
    });
    expect(result2.kind).toBe("milestone");
    expect(result2.value).toBe(30);
    expect(result2.nextState.lastMilestone).toBe(30);
  });

  it("does not fire again on reload after the milestone was recorded", () => {
    const result = decideCelebration({
      currentStreak: 30,
      longestStreak: 30,
      storedState: { lastRecord: 30, lastMilestone: 30 },
    });
    expect(result.kind).toBe("none");
  });

  it("fires the next milestone when the previous one is already stored", () => {
    const result = decideCelebration({
      currentStreak: 100,
      longestStreak: 105,
      storedState: { lastRecord: 105, lastMilestone: 30 },
    });
    expect(result.kind).toBe("milestone");
    expect(result.value).toBe(100);
  });
});

describe("decideCelebration — record and milestone coincide", () => {
  it("fires kind=record and NOT kind=milestone when both would trigger", () => {
    // Crossing day-7 while simultaneously setting a new record
    const result = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: { lastRecord: 6, lastMilestone: 0 },
    });
    expect(result.kind).toBe("record");
  });

  it("silently advances the milestone key so it doesn't fire later", () => {
    const result = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: { lastRecord: 6, lastMilestone: 0 },
    });
    expect(result.kind).toBe("record");
    // Milestone should be advanced to 7 even though we didn't show it
    expect(result.advanceMilestoneTo).toBe(7);
    expect(result.nextState.lastMilestone).toBe(7);
  });

  it("does NOT show the milestone separately on the next reload", () => {
    // Simulate: we saved nextState from the coincident-record scenario above
    const afterRecord = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: { lastRecord: 6, lastMilestone: 0 },
    });
    // Now reload with that persisted state
    const onReload = decideCelebration({
      currentStreak: 7,
      longestStreak: 7,
      storedState: afterRecord.nextState,
    });
    expect(onReload.kind).toBe("none");
  });

  it("celebration fires exactly once across multiple reloads at the same streak value", () => {
    const initial = decideCelebration({
      currentStreak: 30,
      longestStreak: 30,
      storedState: { lastRecord: 29, lastMilestone: 7 },
    });
    expect(initial.kind).toBe("record");

    // Simulate three subsequent reloads
    for (let i = 0; i < 3; i++) {
      const reload = decideCelebration({
        currentStreak: 30,
        longestStreak: 30,
        storedState: initial.nextState,
      });
      expect(reload.kind).toBe("none");
    }
  });
});

describe("decideCelebration — returning users (retroactive protection)", () => {
  it("does not celebrate a milestone that was already crossed before feature existed", () => {
    // User already has a 100-day streak. On first observation lastMilestone
    // is seeded to 100, so no celebration fires.
    const baseline = decideCelebration({
      currentStreak: 100,
      longestStreak: 100,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(baseline.kind).toBe("baseline");
    expect(baseline.nextState.lastMilestone).toBe(100);

    // On the very next render (after baseline was stored), nothing fires.
    const nextRender = decideCelebration({
      currentStreak: 100,
      longestStreak: 100,
      storedState: baseline.nextState,
    });
    expect(nextRender.kind).toBe("none");
  });

  it("does not celebrate a record the user already held", () => {
    const baseline = decideCelebration({
      currentStreak: 50,
      longestStreak: 50,
      storedState: { lastRecord: null, lastMilestone: null },
    });
    expect(baseline.kind).toBe("baseline");
    expect(baseline.nextState.lastRecord).toBe(50);

    const nextRender = decideCelebration({
      currentStreak: 50,
      longestStreak: 50,
      storedState: baseline.nextState,
    });
    expect(nextRender.kind).toBe("none");
  });

  it("celebrates the NEXT record after baseline is established", () => {
    // Baseline seeded at streak=50
    const baseline = decideCelebration({
      currentStreak: 50,
      longestStreak: 50,
      storedState: { lastRecord: null, lastMilestone: null },
    });

    // Next day: streak advances to 51 — now this should fire
    const nextDay = decideCelebration({
      currentStreak: 51,
      longestStreak: 51,
      storedState: baseline.nextState,
    });
    expect(nextDay.kind).toBe("record");
    expect(nextDay.value).toBe(51);
  });
});
