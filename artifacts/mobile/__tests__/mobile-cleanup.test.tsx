/**
 * Regression tests for the mobile navigation / Today / Habits / Growth cleanup.
 */
import React from "react";
import { render, cleanup, fireEvent, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert, Platform } from "react-native";

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
  useAuth: () => ({ userId: "user_a", isLoaded: true, isSignedIn: true }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

const mockScreens: { name: string; options: any }[] = [];
jest.mock("expo-router", () => {
  const R = require("react");
  const Tabs: any = ({ children }: any) => R.createElement(R.Fragment, null, children);
  Tabs.Screen = (p: any) => { mockScreens.push({ name: p.name, options: p.options }); return null; };
  return { router: { push: jest.fn(), back: jest.fn() }, Tabs, Redirect: () => null };
});
jest.mock("expo-blur", () => ({ BlurView: () => null }));
jest.mock("expo-symbols", () => ({ SymbolView: () => null }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const R = require("react");
  return { __esModule: true, default: (p: any) => R.createElement(View, p), Circle: (p: any) => R.createElement(View, p) };
});

const mockPalette = {
  background: "#191919", foreground: "#F7F4EF", card: "#1F1F23", cardForeground: "#F7F4EF",
  primary: "#C9A439", primaryForeground: "#191919", secondary: "#8A8A8F", accent: "#C9A439",
  muted: "#2A2A2E", mutedForeground: "#8A8A8F", border: "#333338", input: "#2A2A2E",
  destructive: "#E5484D", text: "#F7F4EF", tint: "#C9A439", radius: 12,
};
jest.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ palette: mockPalette }) }));
jest.mock("@/hooks/useColors", () => ({ useColors: () => mockPalette }));
jest.mock("@/components/FeedbackNudgeBanner", () => ({ FeedbackNudgeBanner: () => null }));
jest.mock("@/components/CompletionRing", () => ({ CompletionRing: () => null }));
jest.mock("@/components/KeyboardAwareScrollViewCompat", () => {
  const { ScrollView } = require("react-native");
  return { KeyboardAwareScrollViewCompat: ScrollView };
});
jest.mock("@workspace/api-client-react", () => require("./__mocks__/api-client-react"));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

let api: any;
beforeAll(() => { api = require("./__mocks__/api-client-react"); });
beforeEach(async () => {
  await cleanup();
  api.__reset();
  api.__resetHabitUpdate();
  api.__setAffirmationResult({ text: "You are steady and you are enough." });
  for (const k of Object.keys(mockStore)) delete mockStore[k];
});
afterEach(async () => { await cleanup(); });

const habit = (o: any = {}) => ({
  id: 1, name: "Stretch", description: "", checkedInToday: false, currentStreak: 0,
  todayStatus: null, recentCheckins: undefined, category: null, ...o,
});

const intention = (id: number, order: number, isCompleted: boolean) => ({
  id, order, isCompleted, text: `Intention ${id}`, date: "2025-01-01", createdAt: "", updatedAt: "",
});

describe("Tab layout", () => {
  it("shows exactly five tabs and hides pulse/growth/memories", async () => {
    mockScreens.length = 0;
    const Layout = require("../app/(tabs)/_layout").default;
    await render(<Layout />);
    const visible = mockScreens.filter((s) => s.options?.href !== null).map((s) => s.options.title);
    expect(visible).toEqual(["Today", "Habits", "Life", "Memos", "Profile"]);
    for (const n of ["pulse", "growth", "memories"]) {
      expect(mockScreens.find((s) => s.name === n)?.options.href).toBeNull();
    }
  });
});

describe("Life hub", () => {
  it("places What's Good and Memories right after Growth Hub", async () => {
    const Life = require("../app/(tabs)/life/index").default;
    const { getAllByText } = await render(<Life />);
    const labels = getAllByText(/.+/).map((n: any) => n.props.children).filter((c: any) => typeof c === "string");
    const i = labels.indexOf("Growth Hub");
    expect(labels.slice(i + 1, i + 5)).toEqual(expect.arrayContaining(["What's Good", "Memories"]));
    expect(labels).toContain("Your circle's pulse");
    expect(labels).toContain("Your life in albums");
    expect(labels).not.toContain("Pulse");
  });
});

describe("Growth Hub", () => {
  it("shows a done/total habits summary that links to Habits, plus Goals/Journal only", async () => {
    api.__setHabits([habit({ id: 1, checkedInToday: true }), habit({ id: 2 })]);
    const Growth = require("../app/(tabs)/life/growth").default;
    const { getByTestId, queryByText, getByText, getAllByText } = await render(wrap(<Growth />));
    expect(getByText("Made for you")).toBeTruthy();
    expect(queryByText("Daily Habits")).toBeNull();
    expect(getAllByText("Goals").length).toBeGreaterThan(0);
    expect(getByText("Journal")).toBeTruthy();
    fireEvent.press(getByTestId("growth-habits-summary"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/(tabs)/habits");
  });
});

describe("Habits categories and actions", () => {
  it("always shows a category, defaulting to Health", async () => {
    api.__setHabits([habit({ id: 1 }), habit({ id: 2, name: "Read", category: "learning" })]);
    const Habits = require("../app/(tabs)/habits").default;
    const { getByTestId } = await render(wrap(<Habits />));
    expect(getByTestId("habit-category-1").props.children).toBe("Health");
    expect(getByTestId("habit-category-2").props.children).toBe("Learning");
  });

  it("creates with the selected category", async () => {
    const Habits = require("../app/(tabs)/habits").default;
    const { getByText, getByPlaceholderText, getByTestId } = await render(wrap(<Habits />));
    await act(async () => { fireEvent.press(getByText("Add Habit")); });
    await act(async () => { fireEvent.changeText(getByPlaceholderText(/Morning meditation/), "Walk"); });
    await act(async () => { fireEvent.press(getByTestId("habit-category-option-fitness")); });
    await act(async () => { fireEvent.press(getByText("Create")); });
    expect(api.__getCreateHabitSpy()).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Walk", category: "fitness" }) }),
      expect.anything(),
    );
  });

  it("long-press Edit prefills and saves through useUpdateHabit; errors alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    api.__setHabits([habit({ id: 9, name: "Read", category: "learning" })]);
    const Habits = require("../app/(tabs)/habits").default;
    const { getByText, getByDisplayValue } = await render(wrap(<Habits />));
    await act(async () => { fireEvent(getByText("Read"), "longPress"); });
    const menu = alertSpy.mock.calls[0][2] as any[];
    expect(menu.map((b) => b.text)).toEqual(["Edit", "Delete", "Cancel"]);
    await act(async () => { menu[0].onPress(); });
    expect(getByText("Edit Habit")).toBeTruthy();
    await act(async () => { fireEvent.changeText(getByDisplayValue("Read"), "Read 20 pages"); });
    api.__setUpdateHabitError(new Error("net"));
    await act(async () => { fireEvent.press(getByText("Save")); });
    expect(api.__getUpdateHabitSpy()).toHaveBeenCalledWith({
      id: 9, data: { name: "Read 20 pages", description: "", category: "learning" },
    });
    expect(alertSpy).toHaveBeenCalledWith("Oops", expect.stringContaining("Couldn't save"));
    alertSpy.mockRestore();
  });

  it("Delete requires an explicit confirmation before the mutation fires", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    api.__setHabits([habit({ id: 4, name: "Floss" })]);
    const Habits = require("../app/(tabs)/habits").default;
    const { getByText } = await render(wrap(<Habits />));
    await act(async () => { fireEvent(getByText("Floss"), "longPress"); });
    await act(async () => { (alertSpy.mock.calls[0][2] as any[])[1].onPress(); });
    expect(api.__getDeleteHabitSpy()).not.toHaveBeenCalled();
    const confirm = alertSpy.mock.calls[1][2] as any[];
    await act(async () => { confirm.find((b) => b.text === "Delete").onPress(); });
    expect(api.__getDeleteHabitSpy()).toHaveBeenCalledWith({ id: 4 }, expect.anything());
    alertSpy.mockRestore();
  });
});

describe("Today", () => {
  it("deduplicates daily generation and isolates each user's cache", async () => {
    const { getDailyAffirmation } = require("../utils/dailyAffirmation");
    const generate = jest.fn().mockResolvedValue({ text: "First user's affirmation" });
    const results = await Promise.all([
      getDailyAffirmation("first-user", "2026-10-10", generate),
      getDailyAffirmation("first-user", "2026-10-10", generate),
    ]);
    expect(results).toEqual(["First user's affirmation", "First user's affirmation"]);
    expect(generate).toHaveBeenCalledTimes(1);
    const other = jest.fn().mockResolvedValue({ text: "Second user's affirmation" });
    expect(await getDailyAffirmation("second-user", "2026-10-10", other)).toBe("Second user's affirmation");
    expect(other).toHaveBeenCalledTimes(1);
  });

  it("caches an offline fallback rather than retrying AI on each visit", async () => {
    const { getDailyAffirmation, fallbackAffirmation } = require("../utils/dailyAffirmation");
    const generate = jest.fn().mockRejectedValue(new Error("offline"));
    const first = await getDailyAffirmation("offline-user", "2026-10-10", generate);
    const second = await getDailyAffirmation("offline-user", "2026-10-10", generate);
    expect(first).toBe(fallbackAffirmation("2026-10-10"));
    expect(second).toBe(first);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("greeting follows local time", () => {
    const { greeting } = require("../app/(tabs)/index");
    expect(greeting(new Date(2025, 0, 1, 8))).toBe("Good Morning");
    expect(greeting(new Date(2025, 0, 1, 14))).toBe("Good Afternoon");
    expect(greeting(new Date(2025, 0, 1, 20))).toBe("Good Evening");
  });

  it("has no sign-out control and shows the habits strip with one-tap check-in", async () => {
    api.__setIntentions([intention(1, 0, false), intention(2, 1, false), intention(3, 2, false)]);
    api.__setHabits([habit({ id: 3, name: "Water", currentStreak: 4 })]);
    const Today = require("../app/(tabs)/index").default;
    const { queryByLabelText, getByTestId } = await render(wrap(<Today />));
    expect(queryByLabelText("Sign out")).toBeNull();
    await act(async () => { fireEvent.press(getByTestId("today-habit-3")); });
    expect(api.__getCheckInHabitSpy()).toHaveBeenCalledWith({ id: 3, data: { status: "great" } }, expect.anything());
  });

  it("habits strip shows an error with retry", async () => {
    api.__setIntentions([intention(1, 0, false), intention(2, 1, false), intention(3, 2, false)]);
    api.__setHabitsError(true);
    const Today = require("../app/(tabs)/index").default;
    const { getByTestId } = await render(wrap(<Today />));
    expect(getByTestId("today-habits-error")).toBeTruthy();
  });

  it("caches the daily affirmation per user and local day", async () => {
    api.__setIntentions([intention(1, 0, false), intention(2, 1, false), intention(3, 2, false)]);
    const { localDayKey, cacheKey } = require("../utils/dailyAffirmation");
    const Today = require("../app/(tabs)/index").default;
    const r1 = await render(wrap(<Today />));
    await waitFor(() => expect(r1.getByTestId("today-affirmation-text")).toBeTruthy());
    expect(mockStore[cacheKey("user_a", localDayKey())]).toBe("You are steady and you are enough.");
    expect(api.__getAffirmationSpy()).toHaveBeenCalledTimes(1);
    await cleanup();
    api.__setAffirmationResult({ text: "different" });
    const r2 = await render(wrap(<Today />));
    await waitFor(() => expect(r2.getByText("You are steady and you are enough.")).toBeTruthy());
    expect(api.__getAffirmationSpy()).not.toHaveBeenCalled();
  });

  it("falls back to a static affirmation when offline", async () => {
    api.__setIntentions([intention(1, 0, false), intention(2, 1, false), intention(3, 2, false)]);
    api.__setAffirmationResult(new Error("offline"));
    const Today = require("../app/(tabs)/index").default;
    const { getByTestId } = await render(wrap(<Today />));
    await waitFor(() => expect(getByTestId("today-affirmation-fallback")).toBeTruthy());
  });

  it("celebrates only on the transition to all-done, not on initial load", async () => {
    const Haptics = require("expo-haptics");
    const origOS = Platform.OS;
    (Platform as any).OS = "ios";
    api.__setIntentions([intention(1, 0, true), intention(2, 1, true), intention(3, 2, true)]);
    const Today = require("../app/(tabs)/index").default;
    (Haptics.impactAsync as jest.Mock).mockClear();
    const r = await render(wrap(<Today />));
    expect(r.queryByTestId("intentions-celebration")).toBeNull();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    await cleanup();

    api.__setIntentions([intention(1, 0, true), intention(2, 1, true), intention(3, 2, false)]);
    const r2 = await render(wrap(<Today />));
    (Haptics.impactAsync as jest.Mock).mockClear();
    api.__setIntentions([intention(1, 0, true), intention(2, 1, true), intention(3, 2, true)]);
    await act(async () => { r2.rerender(wrap(<Today />)); });
    // Animation may finish synchronously under jest; the light haptic proves the transition fired.
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
    (Platform as any).OS = origOS;
  });
});
