/**
 * UI tests for the 333 streak screen.
 *
 * Covers:
 *  - Current and best streak values render correctly
 *  - Empty state renders when no completed days exist
 *  - Streak reflects a completed day
 *
 * NOTE: Kept in a separate file from intentions-setup.test.tsx so each
 * runs in its own Jest worker with a clean module registry. Mixing
 * TodayScreen and StreakScreen renders in the same file causes
 * test-renderer state to bleed across tests in RNTL v14.
 */

import React from "react";
import { render, cleanup } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {},
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

let StreakScreen: React.ComponentType;
let mockApi: any;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  StreakScreen = require("../app/(tabs)/streak").default;
});

beforeEach(() => {
  mockApi.__reset();
});

afterEach(async () => {
  await cleanup();
});

// ── Streak screen ─────────────────────────────────────────────────────────

describe("Streak screen", () => {
  it("shows the current and best streak from history data", async () => {
    mockApi.__setHistory({
      currentStreak: 7,
      longestStreak: 14,
      completedDays: ["2026-07-28", "2026-07-27"],
    });
    const { getByText } = await render(withProviders(<StreakScreen />));

    // Numbers render as "7\nday\ns" in RNTL v14 combined text — match prefix
    expect(getByText(/^7/)).toBeTruthy();
    expect(getByText(/^14/)).toBeTruthy();
    expect(getByText("CURRENT")).toBeTruthy();
    expect(getByText("BEST RUN")).toBeTruthy();
  });

  it("shows the empty state when no completed days exist", async () => {
    mockApi.__setHistory({
      currentStreak: 0,
      longestStreak: 0,
      completedDays: [],
    });
    const { getByText } = await render(withProviders(<StreakScreen />));

    expect(getByText(/No complete 333 days yet/)).toBeTruthy();
  });

  it("reflects a streak after a day is marked complete", async () => {
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    // Use distinct values (3 vs 5) so each number is unique in the tree
    mockApi.__setHistory({
      currentStreak: 3,
      longestStreak: 5,
      completedDays: [todayKey],
    });
    const { getByText } = await render(withProviders(<StreakScreen />));

    expect(getByText(/^3/)).toBeTruthy();
    expect(getByText(/^5/)).toBeTruthy();
    expect(getByText("Your History")).toBeTruthy();
  });

  // ── Edge-case / crash-regression tests ────────────────────────────────

  it("renders without crashing while history data is loading (pre-load race)", async () => {
    mockApi.__setHistoryLoading(true);
    // render() must not throw — if the screen crashes it throws here
    const { queryByText } = await render(withProviders(<StreakScreen />));

    // Main streak content must NOT be visible during the loading phase
    expect(queryByText("CURRENT")).toBeNull();
    expect(queryByText("BEST RUN")).toBeNull();
    expect(queryByText("Your History")).toBeNull();
  });

  it("renders gracefully when history data is undefined after load completes", async () => {
    // Simulate the gap between isLoading=false and data arriving (null race)
    mockApi.__setHistoryNull(true);
    const { getByText, getAllByText } = await render(withProviders(<StreakScreen />));

    // Both stat cards fall back to 0 — they must both be present
    expect(getAllByText(/^0/).length).toBeGreaterThanOrEqual(2);
    expect(getByText("CURRENT")).toBeTruthy();
    expect(getByText("BEST RUN")).toBeTruthy();
    // No history → empty state copy must render
    expect(getByText(/No complete 333 days yet/)).toBeTruthy();
  });

  it("renders a very large streak number (>999) without crashing", async () => {
    mockApi.__setHistory({
      currentStreak: 1234,
      longestStreak: 9999,
      completedDays: [],
    });
    const { getByText } = await render(withProviders(<StreakScreen />));

    // Both large numbers must appear without layout errors
    expect(getByText(/^1234/)).toBeTruthy();
    expect(getByText(/^9999/)).toBeTruthy();
    expect(getByText("CURRENT")).toBeTruthy();
    expect(getByText("BEST RUN")).toBeTruthy();
  });
});
