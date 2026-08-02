/**
 * UI tests for the 333 intentions flow – Setup & Active states.
 *
 * Covers:
 *  - Setup state: renders form, disables button, calls createIntention × 3
 *  - Error handling: shows Alert on network failure rather than broken UI
 *  - Active state: renders intentions, toggles completion, shows ALL COMPLETE
 */

import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, act, cleanup } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const R = require("react");
  return {
    __esModule: true,
    default: (p: any) => R.createElement(View, p),
    Circle: (p: any) => R.createElement(View, p),
  };
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
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

jest.mock("@/components/FeedbackNudgeBanner", () => ({
  FeedbackNudgeBanner: () => null,
}));

jest.mock("@/components/CompletionRing", () => ({
  CompletionRing: () => null,
}));

jest.mock("@/components/KeyboardAwareScrollViewCompat", () => {
  const { ScrollView } = require("react-native");
  return { KeyboardAwareScrollViewCompat: ScrollView };
});

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

let TodayScreen: React.ComponentType;
let mockApi: ReturnType<typeof require>;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  TodayScreen = require("../app/(tabs)/index").default;
});

beforeEach(() => {
  mockApi.__reset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
});

// ── 0. Loading state ──────────────────────────────────────────────────────

describe("Loading state (API slow / pre-load race)", () => {
  it("renders without crashing when intentions are still loading (API slow / pre-load race)", async () => {
    mockApi.__setIntentionsLoading(true);
    // render() must not throw — if the screen crashes it throws here
    const { queryByText } = await render(withProviders(<TodayScreen />));

    // The setup form and active state must NOT be visible during loading;
    // both branches read from `intentions` which is undefined while isLoading=true
    expect(queryByText("Set My Intentions")).toBeNull();
    expect(queryByText("THE 333 METHOD")).toBeNull();
    expect(queryByText("Intention A")).toBeNull();
    expect(queryByText("ALL COMPLETE")).toBeNull();
  });
});

// ── 1. Setup state ────────────────────────────────────────────────────────

describe("Setup state (< 3 intentions)", () => {
  it("renders the set-intentions form when no intentions exist", async () => {
    mockApi.__setIntentions([]);
    const { getByText } = await render(withProviders(<TodayScreen />));

    expect(getByText("Set My Intentions")).toBeTruthy();
    expect(getByText("THE 333 METHOD")).toBeTruthy();
  });

  it("disables the Set button until all three fields are filled", async () => {
    mockApi.__setIntentions([]);
    const { getByText } = await render(withProviders(<TodayScreen />));

    await fireEvent.press(getByText("Set My Intentions"));
    expect(mockApi.useCreateIntention().mutateAsync).not.toHaveBeenCalled();
  });

  it("calls createIntention for all three slots when form is submitted", async () => {
    mockApi.__setIntentions([]);
    const { getByPlaceholderText, getByText } = await render(
      withProviders(<TodayScreen />),
    );

    await fireEvent.changeText(
      getByPlaceholderText("Call Mom and really listen"),
      "Intention A",
    );
    await fireEvent.changeText(
      getByPlaceholderText("Finish the proposal draft"),
      "Intention B",
    );
    await fireEvent.changeText(
      getByPlaceholderText("Move my body for 30 minutes"),
      "Intention C",
    );

    await act(async () => {
      await fireEvent.press(getByText("Set My Intentions"));
    });

    const mutateAsync = mockApi.useCreateIntention().mutateAsync;
    expect(mutateAsync).toHaveBeenCalledTimes(3);
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { text: "Intention A", order: 0 },
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { text: "Intention B", order: 1 },
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { text: "Intention C", order: 2 },
    });
  });

  it("shows an error alert when createIntention fails (network error)", async () => {
    mockApi.__setIntentions([]);
    mockApi.__setCreateError(new Error("Network request failed"));

    const { getByPlaceholderText, getByText } = await render(
      withProviders(<TodayScreen />),
    );

    await fireEvent.changeText(
      getByPlaceholderText("Call Mom and really listen"),
      "Intention A",
    );
    await fireEvent.changeText(
      getByPlaceholderText("Finish the proposal draft"),
      "Intention B",
    );
    await fireEvent.changeText(
      getByPlaceholderText("Move my body for 30 minutes"),
      "Intention C",
    );

    await act(async () => {
      await fireEvent.press(getByText("Set My Intentions"));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Something went wrong",
      expect.stringContaining("connection"),
    );
  });
});

// ── 2. Active state ───────────────────────────────────────────────────────

describe("Active state (3 intentions set)", () => {
  const threeIntentions = [
    { id: 1, text: "Intention A", order: 0, isCompleted: false },
    { id: 2, text: "Intention B", order: 1, isCompleted: false },
    { id: 3, text: "Intention C", order: 2, isCompleted: false },
  ];

  it("renders all three intentions in the active state", async () => {
    mockApi.__setIntentions(threeIntentions);
    const { getByText, queryByText } = await render(
      withProviders(<TodayScreen />),
    );

    expect(getByText("Intention A")).toBeTruthy();
    expect(getByText("Intention B")).toBeTruthy();
    expect(getByText("Intention C")).toBeTruthy();
    expect(queryByText("Set My Intentions")).toBeNull();
  });

  it("calls updateIntention with isCompleted:true when an intention is tapped", async () => {
    mockApi.__setIntentions(threeIntentions);
    const { getByText } = await render(withProviders(<TodayScreen />));

    await act(async () => {
      await fireEvent.press(getByText("Intention A"));
    });

    const mutate = mockApi.useUpdateIntention().mutate as jest.Mock;
    expect(mutate).toHaveBeenCalledWith(
      { id: 1, data: { isCompleted: true } },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("calls updateIntention with isCompleted:false when a completed intention is tapped", async () => {
    const withCompleted = [
      { id: 1, text: "Intention A", order: 0, isCompleted: true },
      { id: 2, text: "Intention B", order: 1, isCompleted: false },
      { id: 3, text: "Intention C", order: 2, isCompleted: false },
    ];
    mockApi.__setIntentions(withCompleted);
    const { getByText } = await render(withProviders(<TodayScreen />));

    await act(async () => {
      await fireEvent.press(getByText("Intention A"));
    });

    const mutate = mockApi.useUpdateIntention().mutate as jest.Mock;
    expect(mutate).toHaveBeenCalledWith(
      { id: 1, data: { isCompleted: false } },
      expect.anything(),
    );
  });

  it("shows 'ALL COMPLETE' copy when all three intentions are done", async () => {
    const allDone = threeIntentions.map((i) => ({ ...i, isCompleted: true }));
    mockApi.__setIntentions(allDone);
    const { getByText } = await render(withProviders(<TodayScreen />));

    expect(getByText("ALL COMPLETE")).toBeTruthy();
    expect(getByText(/All three, complete/)).toBeTruthy();
  });

  it("shows an error alert when updateIntention fails (network error)", async () => {
    mockApi.__setIntentions(threeIntentions);
    const { getByText } = await render(withProviders(<TodayScreen />));

    await act(async () => {
      await fireEvent.press(getByText("Intention A"));
    });

    const mutate = mockApi.useUpdateIntention().mutate as jest.Mock;
    const { onError } = mutate.mock.calls[0][1];

    act(() => {
      onError(new Error("Network request failed"));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Something went wrong",
      expect.stringContaining("try again"),
    );
  });
});
