/**
 * Pure celebration-decision logic for intention streaks.
 *
 * Keeping this separate from the React component lets us cover all the
 * edge-cases (baseline seeding, single-fire guarantees, record-wins-over-
 * milestone tie-breaking) with plain unit tests that don't need a DOM.
 */

/** Round-number thresholds worth celebrating even when they aren't a new
 *  personal best.  Must be kept in ascending order. */
export const STREAK_MILESTONES: readonly number[] = [7, 30, 100, 365];

/**
 * Returns the highest milestone that the given streak has reached,
 * or 0 if no milestone has been crossed yet.
 */
export const highestMilestoneAtOrBelow = (streak: number): number =>
  STREAK_MILESTONES.reduce((acc, m) => (streak >= m ? m : acc), 0);

// ─── Stored-state shape ────────────────────────────────────────────────────

/**
 * What we persist in localStorage.
 * `null` means "never observed on this device" (needs baseline seeding).
 */
export interface StreakStoredState {
  /** The streak value we last celebrated as a record, or null if unseen. */
  lastRecord: number | null;
  /** The highest milestone we last celebrated, or null if unseen. */
  lastMilestone: number | null;
}

// ─── Decision result ───────────────────────────────────────────────────────

export type CelebrationKind =
  | "baseline"   // first observation on this device – seed the keys, do nothing visible
  | "record"     // new personal-best streak
  | "milestone"  // crossed a round-number threshold (not simultaneously a new record)
  | "none";      // nothing has changed since we last checked

export interface CelebrationDecision {
  kind: CelebrationKind;
  /** Defined when kind === "record" or "milestone". */
  value?: number;
  /**
   * When kind === "record" and a coincident milestone was also crossed,
   * we advance the milestone key silently so it doesn't fire later.
   */
  advanceMilestoneTo?: number;
  /** The values that should be written back to storage after this decision. */
  nextState: StreakStoredState;
}

// ─── Core decision function ────────────────────────────────────────────────

/**
 * Given the live streak data and what we last persisted, decide what (if
 * anything) to celebrate and what to write back to storage.
 *
 * This is a pure function — it never touches localStorage or React state.
 */
export function decideCelebration(params: {
  currentStreak: number;
  longestStreak: number;
  storedState: StreakStoredState;
}): CelebrationDecision {
  const { currentStreak, longestStreak, storedState } = params;
  const { lastRecord, lastMilestone } = storedState;

  const recordUninitialized = lastRecord === null || Number.isNaN(lastRecord);
  const milestoneUninitialized =
    lastMilestone === null || Number.isNaN(lastMilestone);

  // ── Baseline seeding ──────────────────────────────────────────────────────
  // First observation on this device: snapshot what the user has already
  // achieved so we never fire a celebration for something earned before we
  // started tracking.
  if (recordUninitialized || milestoneUninitialized) {
    return {
      kind: "baseline",
      nextState: {
        lastRecord: recordUninitialized ? longestStreak : lastRecord!,
        lastMilestone: milestoneUninitialized
          ? highestMilestoneAtOrBelow(currentStreak)
          : lastMilestone!,
      },
    };
  }

  // ── Live comparison ───────────────────────────────────────────────────────
  const isRecordRun = currentStreak > 0 && currentStreak === longestStreak;
  const isNewRecord = isRecordRun && currentStreak > lastRecord!;

  const crossedMilestone = highestMilestoneAtOrBelow(currentStreak);
  const isNewMilestone = crossedMilestone > lastMilestone!;

  // ── Record wins when both would fire on the same day ──────────────────────
  if (isNewRecord) {
    return {
      kind: "record",
      value: currentStreak,
      advanceMilestoneTo: isNewMilestone ? crossedMilestone : undefined,
      nextState: {
        lastRecord: currentStreak,
        lastMilestone: isNewMilestone ? crossedMilestone : lastMilestone!,
      },
    };
  }

  if (isNewMilestone) {
    return {
      kind: "milestone",
      value: crossedMilestone,
      nextState: {
        lastRecord: lastRecord!,
        lastMilestone: crossedMilestone,
      },
    };
  }

  return {
    kind: "none",
    nextState: { lastRecord: lastRecord!, lastMilestone: lastMilestone! },
  };
}
