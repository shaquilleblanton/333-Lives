/**
 * Screen-level error-path regression suite.
 *
 * For every major screen that renders ErrorRetryView, this file verifies:
 *   1. When the primary query hook returns isError=true, ErrorRetryView is shown
 *      ("Couldn't load data" heading).
 *   2. Pressing the "Try Again" button calls the hook's refetch function.
 *
 * Each describe block is independent — beforeEach resets all mock state.
 * These tests run in CI and will catch any future regression that removes or
 * breaks the error-handling path on a screen.
 */

import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Global mocks ─────────────────────────────────────────────────────────────

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    uri: null,
  })),
  useAudioRecorderState: jest.fn(() => ({ isRecording: false, durationMillis: 0 })),
  useAudioPlayer: jest.fn(() => ({
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, didJustFinish: false })),
}));

jest.mock("expo-file-system/legacy", () => ({
  uploadAsync: jest.fn(() => Promise.resolve({ status: 200 })),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1000 })),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Lightweight stubs for components used only by the index tab's success path;
// they are never rendered in error state but must resolve at import time.
jest.mock("@/components/CompletionRing", () => ({
  CompletionRing: () => null,
}));
jest.mock("@/components/FeedbackNudgeBanner", () => ({
  FeedbackNudgeBanner: () => null,
}));
jest.mock("@/components/KeyboardAwareScrollViewCompat", () => ({
  KeyboardAwareScrollViewCompat: ({ children }: { children: React.ReactNode }) => children,
}));

const mockPalette = {
  background: "#191919",
  foreground: "#F7F4EF",
  card: "#1F1F23",
  cardForeground: "#F7F4EF",
  primary: "#C9A439",
  primaryForeground: "#191919",
  secondary: "#8FA67A",
  secondaryForeground: "#191919",
  muted: "#2A2A2E",
  mutedForeground: "#8A8A8F",
  border: "#333338",
  input: "#2A2A2E",
  text: "#F7F4EF",
  tint: "#C9A439",
  destructive: "#E05C5C",
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

/** Verify that a screen shows ErrorRetryView and "Try Again" calls refetch. */
async function assertErrorRetryView(
  Screen: React.ComponentType,
  setError: (v: boolean) => void,
  getRefetch: () => jest.Mock,
) {
  setError(true);
  const { getByText } = await render(withProviders(<Screen />));
  // ErrorRetryView always renders this heading when isError=true
  expect(getByText("Couldn't load data")).toBeTruthy();
  // The "Try Again" button is wired to refetch
  expect(getByText("Try Again")).toBeTruthy();
  fireEvent.press(getByText("Try Again"));
  expect(getRefetch()).toHaveBeenCalledTimes(1);
}

// ── Load screens lazily (same pattern as all other crash-guard test files) ──

let IndexScreen: React.ComponentType;
let MemosScreen: React.ComponentType;
let HabitsScreen: React.ComponentType;
let MemoriesScreen: React.ComponentType;
let TimelineScreen: React.ComponentType;
let FamilyTreeScreen: React.ComponentType;
let PeopleScreen: React.ComponentType;
let TasksScreen: React.ComponentType;
let CommunityScreen: React.ComponentType;
let LegacyLettersScreen: React.ComponentType;
let GratitudeScreen: React.ComponentType;
let FutureScreen: React.ComponentType;
let CalendarScreen: React.ComponentType;
let mockApi: typeof import("./__mocks__/api-client-react");

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react") as typeof import("./__mocks__/api-client-react");
  IndexScreen = require("../app/(tabs)/index").default;
  MemosScreen = require("../app/(tabs)/memos").default;
  HabitsScreen = require("../app/(tabs)/habits").default;
  MemoriesScreen = require("../app/(tabs)/memories").default;
  TimelineScreen = require("../app/(tabs)/life/timeline").default;
  FamilyTreeScreen = require("../app/(tabs)/life/family-tree").default;
  PeopleScreen = require("../app/(tabs)/life/people").default;
  TasksScreen = require("../app/(tabs)/life/tasks").default;
  CommunityScreen = require("../app/(tabs)/life/community").default;
  LegacyLettersScreen = require("../app/(tabs)/life/legacy-letters").default;
  GratitudeScreen = require("../app/(tabs)/life/gratitude").default;
  FutureScreen = require("../app/(tabs)/life/future").default;
  CalendarScreen = require("../app/(tabs)/life/calendar").default;
});

beforeEach(async () => {
  await cleanup();
  (mockApi as any).__reset();
});

afterEach(async () => {
  await cleanup();
});

// ── Error-path tests per screen ───────────────────────────────────────────────

describe("Index (Today) tab — error path", () => {
  it("shows ErrorRetryView when intentions fetch fails", async () => {
    await assertErrorRetryView(
      IndexScreen,
      (v) => (mockApi as any).__setIntentionsError(v),
      () => (mockApi as any).__getIntentionsRefetch(),
    );
  });
});

describe("Voice Memos tab — error path", () => {
  it("shows ErrorRetryView when memos fetch fails", async () => {
    await assertErrorRetryView(
      MemosScreen,
      (v) => (mockApi as any).__setMemosError(v),
      () => (mockApi as any).__getMemosRefetch(),
    );
  });
});

describe("Habits tab — error path", () => {
  it("shows ErrorRetryView when habits fetch fails", async () => {
    await assertErrorRetryView(
      HabitsScreen,
      (v) => (mockApi as any).__setHabitsError(v),
      () => (mockApi as any).__getHabitsRefetch(),
    );
  });
});

describe("Memories tab — error path", () => {
  it("shows ErrorRetryView when collections fetch fails", async () => {
    await assertErrorRetryView(
      MemoriesScreen,
      (v) => (mockApi as any).__setMemoriesError(v),
      () => (mockApi as any).__getMemoriesRefetch(),
    );
  });
});

describe("Life / Timeline screen — error path", () => {
  it("shows ErrorRetryView when life events fetch fails", async () => {
    await assertErrorRetryView(
      TimelineScreen,
      (v) => (mockApi as any).__setLifeEventsError(v),
      () => (mockApi as any).__getLifeEventsRefetch(),
    );
  });
});

describe("Life / Family Tree screen — error path", () => {
  it("shows ErrorRetryView when family members fetch fails", async () => {
    await assertErrorRetryView(
      FamilyTreeScreen,
      (v) => (mockApi as any).__setFamilyMembersError(v),
      () => (mockApi as any).__getFamilyMembersRefetch(),
    );
  });
});

describe("Life / People screen — error path", () => {
  it("shows ErrorRetryView when people fetch fails", async () => {
    await assertErrorRetryView(
      PeopleScreen,
      (v) => (mockApi as any).__setPeopleError(v),
      () => (mockApi as any).__getPeopleRefetch(),
    );
  });
});

describe("Life / Tasks screen — error path", () => {
  it("shows ErrorRetryView when tasks fetch fails", async () => {
    await assertErrorRetryView(
      TasksScreen,
      (v) => (mockApi as any).__setTasksError(v),
      () => (mockApi as any).__getTasksRefetch(),
    );
  });
});

describe("Life / Community screen — error path", () => {
  it("shows ErrorRetryView when community events fetch fails", async () => {
    await assertErrorRetryView(
      CommunityScreen,
      (v) => (mockApi as any).__setCommunityEventsError(v),
      () => (mockApi as any).__getCommunityEventsRefetch(),
    );
  });
});

describe("Life / Legacy Letters screen — error path", () => {
  it("shows ErrorRetryView when letters fetch fails", async () => {
    await assertErrorRetryView(
      LegacyLettersScreen,
      (v) => (mockApi as any).__setLegacyLettersError(v),
      () => (mockApi as any).__getLegacyLettersRefetch(),
    );
  });
});

describe("Life / Gratitude screen — error path", () => {
  it("shows ErrorRetryView when gratitude entries fetch fails", async () => {
    await assertErrorRetryView(
      GratitudeScreen,
      (v) => (mockApi as any).__setGratitudeError(v),
      () => (mockApi as any).__getGratitudeRefetch(),
    );
  });
});

describe("Life / Future Messages screen — error path", () => {
  it("shows ErrorRetryView when messages fetch fails", async () => {
    await assertErrorRetryView(
      FutureScreen,
      (v) => (mockApi as any).__setMessagesError(v),
      () => (mockApi as any).__getMessagesRefetch(),
    );
  });
});

describe("Life / Calendar screen — error path", () => {
  it("shows ErrorRetryView when events fetch fails", async () => {
    await assertErrorRetryView(
      CalendarScreen,
      (v) => (mockApi as any).__setEventsError(v),
      () => (mockApi as any).__getEventsRefetch(),
    );
  });
});

// ── ErrorRetryView component unit tests ─────────────────────────────────────

describe("ErrorRetryView component", () => {
  let ErrorRetryView: React.ComponentType<{
    message?: string;
    onRetry?: () => void;
  }>;

  beforeAll(() => {
    ErrorRetryView = require("../components/ErrorRetryView").ErrorRetryView;
  });

  it("renders the default 'Couldn't load data' heading", async () => {
    const { getByText } = await render(
      withProviders(<ErrorRetryView />),
    );
    expect(getByText("Couldn't load data")).toBeTruthy();
  });

  it("renders a custom message when provided", async () => {
    const { getByText } = await render(
      withProviders(<ErrorRetryView message="Custom error message." />),
    );
    expect(getByText("Custom error message.")).toBeTruthy();
  });

  it("does not render a Try Again button when onRetry is omitted", async () => {
    const { queryByText } = await render(
      withProviders(<ErrorRetryView />),
    );
    expect(queryByText("Try Again")).toBeNull();
  });

  it("renders a Try Again button when onRetry is provided", async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      withProviders(<ErrorRetryView onRetry={onRetry} />),
    );
    expect(getByText("Try Again")).toBeTruthy();
  });

  it("calls onRetry when Try Again is pressed", async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      withProviders(<ErrorRetryView onRetry={onRetry} />),
    );
    fireEvent.press(getByText("Try Again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
