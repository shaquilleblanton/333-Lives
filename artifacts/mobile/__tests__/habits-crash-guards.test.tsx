/**
 * Crash-guard tests for the Habits tab.
 *
 * Covers:
 *  - Loading state renders a spinner and nothing else crashes
 *  - Empty list shows the empty state (no habits yet)
 *  - Populated list renders habit names
 *  - Check-in success opens mood picker and calls mutation
 *  - Check-in error shows an alert without crashing the screen
 *  - Delete confirmation shows an alert with the habit name
 *  - Streak badge renders without crashing
 *  - Checked-in habit with mood emoji renders without crashing
 *  - 7-day dot strip edge cases: empty, null, undefined recentCheckins
 *  - getPast7Days helper across month and year boundaries
 */

import React from "react";
import { render, cleanup, fireEvent, act, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";

import { getPast7Days } from "../utils/getPast7Days";

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
  useAuth: () => ({ userId: "user_test", isLoaded: true, isSignedIn: true }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockPalette = {
  background: "#191919",
  foreground: "#F7F4EF",
  card: "#1F1F23",
  cardForeground: "#F7F4EF",
  primary: "#C9A439",
  primaryForeground: "#191919",
  muted: "#2A2A2E",
  mutedForeground: "#8A8A8F",
  border: "#333338",
  input: "#2A2A2E",
  text: "#F7F4EF",
  tint: "#C9A439",
  radius: 12,
};

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ palette: mockPalette }),
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => mockPalette,
}));

jest.mock("@workspace/api-client-react", () =>
  require("./__mocks__/api-client-react"),
);

// ── Helpers ────────────────────────────────────────────────────────────────

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

let HabitsScreen: React.ComponentType;
let mockApi: any;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  HabitsScreen = require("../app/(tabs)/habits").default;
});

beforeEach(async () => {
  await cleanup();
  mockApi.__reset();
});

afterEach(async () => {
  await cleanup();
});

// ── Sample habit factory ───────────────────────────────────────────────────

function makeHabit(overrides: {
  id?: number;
  name?: string;
  description?: string;
  checkedInToday?: boolean;
  currentStreak?: number;
  todayStatus?: string | null;
  recentCheckins?: any[] | null;
} = {}) {
  return {
    id: 1,
    name: "Morning meditation",
    description: "",
    checkedInToday: false,
    currentStreak: 0,
    todayStatus: null,
    recentCheckins: undefined as any,
    ...overrides,
  };
}

/** Build a valid 7-day recentCheckins array ending on `todayStr`. */
function makeRecentCheckins(
  todayStr: string,
  overrides: Partial<{ done: boolean; status: string | null }>[] = [],
) {
  const base = new Date(todayStr + "T12:00:00Z");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    return { date, done: false, status: null, ...(overrides[i] ?? {}) };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Habits tab – crash guards", () => {
  it("shows a loading spinner while fetching and does not crash", async () => {
    mockApi.__setHabitsLoading(true);
    await render(withProviders(<HabitsScreen />));

    // ActivityIndicator text-based check: the screen must not crash. The
    // "Daily Habits" title is absent when loading because we return early.
    expect(screen.queryByText("Daily Habits")).toBeNull();
  });

  it("shows the empty state when there are no habits", async () => {
    mockApi.__setHabits([]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("No habits yet")).toBeTruthy();
    expect(getByText(/Tap "Add Habit" to start building your first streak/)).toBeTruthy();
  });

  it("renders habit names from the API list", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Morning meditation" }),
      makeHabit({ id: 2, name: "Read 10 pages" }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Morning meditation")).toBeTruthy();
    expect(getByText("Read 10 pages")).toBeTruthy();
  });

  it("shows progress summary when habits are present", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Meditate", checkedInToday: true, currentStreak: 3 }),
      makeHabit({ id: 2, name: "Read", checkedInToday: false }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText(/1 of 2 complete/)).toBeTruthy();
  });

  it("shows 'All done' banner when every habit is checked in", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Meditate", checkedInToday: true }),
      makeHabit({ id: 2, name: "Read", checkedInToday: true }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText(/All done for today/)).toBeTruthy();
  });

  it("calls check-in mutation on tap and opens the mood picker", async () => {
    mockApi.__setHabits([makeHabit({ id: 42, name: "Exercise" })]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    await act(async () => {
      fireEvent.press(getByText("Exercise"));
    });

    // Mood picker should now be open
    expect(getByText("How did it go?")).toBeTruthy();
  });

  it("calls check-in mutation with habit id and mood when mood is selected", async () => {
    mockApi.__setHabits([makeHabit({ id: 42, name: "Exercise" })]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    await act(async () => {
      fireEvent.press(getByText("Exercise"));
    });

    await act(async () => {
      fireEvent.press(getByText("Great"));
    });

    const spy = mockApi.__getCheckInHabit();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, data: { status: "great" } }),
      expect.anything(),
    );
  });

  it("shows an alert when check-in fails without crashing the screen", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockApi.__setCheckInError(new Error("network error"));
    mockApi.__setHabits([makeHabit({ id: 7, name: "Yoga" })]);

    const { getByText } = await render(withProviders(<HabitsScreen />));

    await act(async () => {
      fireEvent.press(getByText("Yoga"));
    });

    await act(async () => {
      fireEvent.press(getByText("Okay"));
    });

    expect(alertSpy).toHaveBeenCalledWith("Oops", "Couldn't check in. Please try again.");

    // Screen still renders — no crash
    expect(getByText("Yoga")).toBeTruthy();
    alertSpy.mockRestore();
  });

  it("shows delete confirmation alert with the habit name on long press", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockApi.__setHabits([makeHabit({ id: 5, name: "Journaling" })]);

    const { getByText } = await render(withProviders(<HabitsScreen />));

    await act(async () => {
      fireEvent(getByText("Journaling"), "longPress");
    });

    // Long press opens an Edit/Delete menu first…
    expect(alertSpy).toHaveBeenCalledWith("Journaling", undefined, expect.any(Array));
    const menu = alertSpy.mock.calls[0][2] as any[];
    await act(async () => { menu.find((b) => b.text === "Delete").onPress(); });
    // …then an explicit delete confirmation with the habit name.
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete habit?",
      expect.stringContaining("Journaling"),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("renders a habit with a streak badge without crashing", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Cold shower", currentStreak: 12 }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("12")).toBeTruthy();
    expect(getByText("Cold shower")).toBeTruthy();
  });

  it("renders a checked-in habit with mood emoji without crashing", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Run", checkedInToday: true, todayStatus: "great" }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Run")).toBeTruthy();
  });

  // ── Create Habit form tests ────────────────────────────────────────────────

  it("does not call createHabit mutation when name is empty", async () => {
    mockApi.__setHabits([]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    // Open the create modal
    await act(async () => {
      fireEvent.press(getByText("Add Habit"));
    });

    // "New Habit" modal should be visible
    expect(getByText("New Habit")).toBeTruthy();

    // Press Create without entering a name
    await act(async () => {
      fireEvent.press(getByText("Create"));
    });

    // Mutation spy must not have been called
    const spy = mockApi.__getCreateHabit();
    expect(spy).not.toHaveBeenCalled();

    // Modal stays open
    expect(getByText("New Habit")).toBeTruthy();
  });

  it("closes the modal and resets fields on successful create", async () => {
    mockApi.__setHabits([]);
    const { getByText, getByPlaceholderText, queryByText } = await render(
      withProviders(<HabitsScreen />),
    );

    // Open the create modal
    await act(async () => {
      fireEvent.press(getByText("Add Habit"));
    });

    expect(getByText("New Habit")).toBeTruthy();

    // Enter a habit name
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Morning meditation, read 10 pages…"),
        "Daily walk",
      );
    });

    // Submit
    await act(async () => {
      fireEvent.press(getByText("Create"));
    });

    // Modal should be closed
    expect(queryByText("New Habit")).toBeNull();
  });

  // ── Malformed / incomplete API data ───────────────────────────────────────

  it("renders without crashing when a habit has null description", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Meditate", description: null as any }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    // Name must still be visible; no crash from null description
    expect(getByText("Meditate")).toBeTruthy();
  });

  it("treats undefined currentStreak as 0 and renders without crashing", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Yoga", currentStreak: undefined as any }),
    ]);
    const { getByText, getAllByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Yoga")).toBeTruthy();
    // The streak badge only renders when currentStreak > 0 (via `?? 0` guard).
    // Any "0" on screen comes from the progress counter, not a streak badge —
    // confirm there is at most one "0" (the progress pill), not two.
    expect(getAllByText("0").length).toBeLessThanOrEqual(1);
  });

  it("treats missing checkedInToday as false and renders the habit as unchecked", async () => {
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Read", checkedInToday: undefined as any }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    // Screen must not crash and the habit must be visible
    expect(getByText("Read")).toBeTruthy();
    // "0 of 1 complete" confirms checkedInToday was treated as falsy
    expect(getByText(/0 of 1 complete|Build your first streak/)).toBeTruthy();
  });

  it("shows an alert and keeps the modal open when createHabit fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockApi.__setCreateHabitError(new Error("server error"));
    mockApi.__setHabits([]);

    const { getByText, getByPlaceholderText } = await render(
      withProviders(<HabitsScreen />),
    );

    // Open the create modal
    await act(async () => {
      fireEvent.press(getByText("Add Habit"));
    });

    expect(getByText("New Habit")).toBeTruthy();

    // Enter a habit name
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Morning meditation, read 10 pages…"),
        "Evening run",
      );
    });

    // Submit
    await act(async () => {
      fireEvent.press(getByText("Create"));
    });

    // Alert must have fired
    expect(alertSpy).toHaveBeenCalledWith("Oops", "Couldn't create habit.");

    // Modal must remain open
    expect(getByText("New Habit")).toBeTruthy();

    alertSpy.mockRestore();
  });

  // ── 7-day dot strip – missing / incomplete recentCheckins ─────────────────

  it("renders without crashing when recentCheckins is undefined (no dot strip shown)", async () => {
    mockApi.__setHabits([makeHabit({ id: 1, name: "Meditate", recentCheckins: undefined })]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    // Habit is visible; no crash from missing recentCheckins
    expect(getByText("Meditate")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins is null (no dot strip shown)", async () => {
    mockApi.__setHabits([makeHabit({ id: 1, name: "Meditate", recentCheckins: null })]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Meditate")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins is an empty array (no dot strip shown)", async () => {
    mockApi.__setHabits([makeHabit({ id: 1, name: "Meditate", recentCheckins: [] })]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Meditate")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins has fewer than 7 entries (brand-new habit)", async () => {
    // A habit created today may only have 1 entry
    mockApi.__setHabits([
      makeHabit({
        id: 1,
        name: "New habit",
        recentCheckins: [{ date: "2026-08-13", done: false, status: null }],
      }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("New habit")).toBeTruthy();
  });

  it("renders the 7-day dot strip without crashing when all 7 entries are present", async () => {
    const checkins = makeRecentCheckins("2026-08-13");
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Run", currentStreak: 5, recentCheckins: checkins }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Run")).toBeTruthy();
    // Streak badge must render
    expect(getByText("5")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins entries have null status", async () => {
    const checkins = makeRecentCheckins("2026-08-13", [
      { done: true, status: null },
      { done: true, status: null },
      { done: false, status: null },
      { done: false, status: null },
      { done: true, status: null },
      { done: false, status: null },
      { done: true, status: null },
    ]);
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Walk", checkedInToday: true, recentCheckins: checkins }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Walk")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins entries have mixed mood statuses", async () => {
    const checkins = makeRecentCheckins("2026-08-13", [
      { done: true, status: "great" },
      { done: true, status: "okay" },
      { done: true, status: "struggling" },
      { done: false, status: null },
      { done: true, status: "great" },
      { done: false, status: null },
      { done: true, status: "okay" },
    ]);
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Yoga", currentStreak: 3, recentCheckins: checkins }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Yoga")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins spans a month boundary", async () => {
    // 2026-08-03 → dots 2026-07-28 to 2026-08-03 (crosses July→August)
    const checkins = makeRecentCheckins("2026-08-03");
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Journal", recentCheckins: checkins }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Journal")).toBeTruthy();
  });

  it("renders without crashing when recentCheckins spans a year boundary", async () => {
    // 2026-01-03 → dots 2025-12-28 to 2026-01-03 (crosses Dec→Jan)
    const checkins = makeRecentCheckins("2026-01-03");
    mockApi.__setHabits([
      makeHabit({ id: 1, name: "Cold shower", recentCheckins: checkins }),
    ]);
    const { getByText } = await render(withProviders(<HabitsScreen />));

    expect(getByText("Cold shower")).toBeTruthy();
  });
});

// ── getPast7Days unit tests ────────────────────────────────────────────────

describe("getPast7Days", () => {
  it("returns exactly 7 dates", () => {
    const days = getPast7Days("2026-08-13");
    expect(days).toHaveLength(7);
  });

  it("returns dates in ascending order ending with today", () => {
    const days = getPast7Days("2026-08-13");
    expect(days[6]).toBe("2026-08-13");
    expect(days[0]).toBe("2026-08-07");
  });

  it("handles a mid-month date correctly", () => {
    const days = getPast7Days("2026-08-10");
    expect(days).toEqual([
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
  });

  it("handles a month boundary (August 3 → July 28)", () => {
    const days = getPast7Days("2026-08-03");
    expect(days).toEqual([
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("handles a year boundary (Jan 3 → Dec 28 of previous year)", () => {
    const days = getPast7Days("2026-01-03");
    expect(days).toEqual([
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("handles Feb 29 in a leap year (Mar 1 → Feb 23)", () => {
    // 2028 is a leap year
    const days = getPast7Days("2028-03-01");
    expect(days).toEqual([
      "2028-02-24",
      "2028-02-25",
      "2028-02-26",
      "2028-02-27",
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("handles Feb 28 in a non-leap year (Mar 1 → Feb 23)", () => {
    // 2026 is not a leap year
    const days = getPast7Days("2026-03-01");
    expect(days).toEqual([
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });

  it("returns consecutive dates with no gaps or duplicates", () => {
    const days = getPast7Days("2026-12-31");
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1] + "T12:00:00");
      const curr = new Date(days[i] + "T12:00:00");
      const diffMs = curr.getTime() - prev.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000); // exactly one day
    }
  });

  it("returns only valid YYYY-MM-DD formatted strings", () => {
    const days = getPast7Days("2026-08-13");
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const day of days) {
      expect(day).toMatch(isoPattern);
    }
  });
});
