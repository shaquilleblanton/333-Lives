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
 */

import React from "react";
import { render, cleanup, fireEvent, act, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
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
} = {}) {
  return {
    id: 1,
    name: "Morning meditation",
    description: "",
    checkedInToday: false,
    currentStreak: 0,
    todayStatus: null,
    ...overrides,
  };
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
});
