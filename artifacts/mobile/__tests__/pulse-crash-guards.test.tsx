/**
 * Crash-regression tests for the Pulse screen.
 *
 * Covers the bugs fixed in task #80:
 *  - getInitials() with empty/whitespace name must not crash (filter(Boolean) guard)
 *  - reaction mutation (add/remove) calls onError rather than crashing
 *  - delete post mutation calls onError rather than crashing
 *
 * Test ordering: clean-state tests (empty feed) FIRST so they don't inherit
 * mock data set by subsequent post-rendering tests.
 *
 * onError tests use fireEvent to trigger real UI interactions, then assert
 * Alert.alert is called with "Error" — proving the handler is wired, not a
 * no-op crash.
 */

import React from "react";
import { Alert } from "react-native";
import { render, act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: jest.fn() }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  uploadAsync: jest.fn(() => Promise.resolve({ status: 200 })),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1000 })),
}));

jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    uri: null,
  })),
  useAudioRecorderState: jest.fn(() => ({ durationMillis: 0 })),
  useAudioPlayer: jest.fn(() => ({
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, duration: 0, currentTime: 0 })),
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

let PulseScreen: React.ComponentType;
let mockApi: ReturnType<typeof require>;
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  PulseScreen = require("../app/(tabs)/pulse").default;
});

beforeEach(async () => {
  await cleanup(); // tear down previous render before resetting mock state
  mockApi.__reset();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

// ── Shared post fixture ─────────────────────────────────────────────────────

const basePost = {
  id: 10,
  authorName: "Alice Bob",
  createdAt: new Date().toISOString(),
  type: "text",
  content: "Test post",
  isOwn: false,
  reactions: { fire: 0 },
  myReaction: null,
  isPersistent: true,
  expiresAt: null,
  reactorNames: [],
  mediaUrl: null,
};

// ── Empty feed state (run FIRST — requires clean mock state) ──────────────

describe("Pulse: empty feed renders without crash", () => {
  it("shows empty state when no posts", async () => {
    // _pulsePosts already [] from __reset()
    const { getByText } = await render(withProviders(<PulseScreen />));
    expect(getByText("Nothing yet")).toBeTruthy();
  });
});

// ── getInitials null guard ─────────────────────────────────────────────────

describe("Pulse: getInitials crash guard", () => {
  it("renders without crashing when authorName is empty string", async () => {
    // Before the fix, getInitials("") → "".split(" ") → [""] → [""][0][0]
    // which is undefined, causing .toUpperCase() to throw.
    // The filter(Boolean) guard prevents this.
    mockApi.__setPulsePosts([
      {
        id: 1,
        authorName: "",
        createdAt: new Date().toISOString(),
        type: "text",
        content: "Hello",
        isOwn: false,
        reactions: {},
        myReaction: null,
        isPersistent: true,
        expiresAt: null,
        reactorNames: [],
        mediaUrl: null,
      },
    ]);

    const { getByText } = await render(withProviders(<PulseScreen />));
    expect(getByText("Hello")).toBeTruthy();
  });

  it("renders without crashing when authorName is whitespace-only", async () => {
    mockApi.__setPulsePosts([
      {
        id: 2,
        authorName: "   ",
        createdAt: new Date().toISOString(),
        type: "text",
        content: "Whitespace author",
        isOwn: false,
        reactions: {},
        myReaction: null,
        isPersistent: true,
        expiresAt: null,
        reactorNames: [],
        mediaUrl: null,
      },
    ]);

    const { getByText } = await render(withProviders(<PulseScreen />));
    expect(getByText("Whitespace author")).toBeTruthy();
  });
});

// ── Reaction mutation onError guard ───────────────────────────────────────
//
// These tests fire a real UI interaction (pressing the 🔥 emoji), configure
// the mutation spy to immediately invoke onError, and then assert Alert.alert
// was called with "Error" — proving the handler is wired, not a no-op.

describe("Pulse: reaction mutation onError guard", () => {
  it("react mutation onError path fires Alert, not a crash", async () => {
    mockApi.__setPulsePosts([basePost]); // myReaction: null → press fires reactMutation

    // Configure the spy to call onError immediately when mutate is invoked.
    const reactSpy = mockApi.__getReactToPost();
    reactSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("network"));
    });

    const { getByText } = await render(withProviders(<PulseScreen />));

    // Press the 🔥 emoji — handleReact("fire") → reactMutation.mutate(...)
    fireEvent.press(getByText("🔥"));

    expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String));
  });

  it("unreact mutation onError path fires Alert, not a crash", async () => {
    // myReaction: "fire" → pressing 🔥 fires unreactMutation
    mockApi.__setPulsePosts([{ ...basePost, myReaction: "fire" }]);

    const unreactSpy = mockApi.__getUnreactPost();
    unreactSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("network"));
    });

    const { getByText } = await render(withProviders(<PulseScreen />));

    // Press 🔥 while it is the active reaction → unreact path
    fireEvent.press(getByText("🔥"));

    expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String));
  });
});

// ── Delete post onError guard ──────────────────────────────────────────────
//
// The trash icon triggers a confirmation Alert. Auto-confirming that dialog
// calls deletePost.mutate(), which is configured to fire onError immediately.
// The onError handler must call Alert.alert("Error", ...) — not crash.

describe("Pulse: delete post onError guard", () => {
  it("shows alert on delete failure, not a crash", async () => {
    mockApi.__setPulsePosts([
      {
        id: 20,
        authorName: "Test User",
        createdAt: new Date().toISOString(),
        type: "text",
        content: "My own post",
        isOwn: true, // renders the trash (Delete post) button
        reactions: {},
        myReaction: null,
        isPersistent: true,
        expiresAt: null,
        reactorNames: [],
        mediaUrl: null,
      },
    ]);

    // Configure delete spy to invoke onError immediately.
    const deleteSpy = mockApi.__getDeletePost();
    deleteSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("network"));
    });

    // First Alert call is the "Delete post" confirmation dialog — auto-confirm
    // the destructive button so deletePost.mutate() is actually invoked.
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      buttons?.find((b: any) => b.style === "destructive")?.onPress?.();
    });

    const { getByLabelText } = await render(withProviders(<PulseScreen />));

    // Press the trash button (accessibilityLabel added in task #83).
    fireEvent.press(getByLabelText("Delete post"));

    // Second Alert call must be the "Error" alert from the onError handler.
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});
