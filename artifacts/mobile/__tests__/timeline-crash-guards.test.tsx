/**
 * Crash-regression tests for the Life Timeline screen.
 *
 * Covers the bugs fixed in task #80:
 *  - deleteLifeEvent was missing onError → silent failure / potential crash
 *  - createLifeEvent and updateLifeEvent were missing onError → silent failure
 *
 * The deleteLifeEvent onError test fires a real UI interaction (pressing the
 * trash button), auto-confirms the Alert dialog, and then asserts Alert.alert
 * was called with "Error" — proving the handler is wired, not a no-op.
 */

import React from "react";
import { Alert } from "react-native";
import { render, act, cleanup, fireEvent, waitFor, userEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

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
  useAudioRecorderState: jest.fn(() => ({ durationMillis: 0 })),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

let TimelineScreen: React.ComponentType;
let mockApi: ReturnType<typeof require>;
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  TimelineScreen = require("../app/(tabs)/life/timeline").default;
});

beforeEach(async () => {
  await cleanup(); // guard against contamination from a failed previous test
  mockApi.__reset();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

// ── Empty state ────────────────────────────────────────────────────────────

describe("Timeline: empty state renders without crash", () => {
  it("shows no-milestones prompt when event list is empty", async () => {
    mockApi.__setLifeEvents([]);
    const { getByText } = await render(withProviders(<TimelineScreen />));
    expect(getByText("No milestones yet")).toBeTruthy();
  });
});

// ── Event list renders safely ──────────────────────────────────────────────

describe("Timeline: event list renders without crash", () => {
  it("renders events with all required fields", async () => {
    mockApi.__setLifeEvents([
      {
        id: 1,
        title: "Graduated college",
        date: "2010-05-15",
        approximateDate: false,
        category: "education",
        description: "Got my degree",
        mediaUrls: [],
      },
      {
        id: 2,
        title: "Started first job",
        date: "2010-09-01",
        approximateDate: false,
        category: "career",
        description: null,
        mediaUrls: null, // null guard is needed here too
      },
    ]);
    const { getByText } = await render(withProviders(<TimelineScreen />));
    expect(getByText("Graduated college")).toBeTruthy();
    expect(getByText("Started first job")).toBeTruthy();
  });

  it("renders event with approximate date without crashing", async () => {
    mockApi.__setLifeEvents([
      {
        id: 3,
        title: "Childhood memory",
        date: "1995-06",
        approximateDate: true,
        category: "family",
        description: null,
        mediaUrls: [],
      },
    ]);
    const { getByText } = await render(withProviders(<TimelineScreen />));
    expect(getByText("Childhood memory")).toBeTruthy();
    // Should render approximate date without crashing (Jun 1995)
    expect(getByText(/Jun 1995/)).toBeTruthy();
  });

  it("renders event with unknown category without crashing", async () => {
    // getCategoryMeta falls back to "other" — must not crash
    mockApi.__setLifeEvents([
      {
        id: 4,
        title: "Unknown category event",
        date: "2020-01-01",
        approximateDate: false,
        category: "unknown_future_category",
        description: null,
        mediaUrls: [],
      },
    ]);
    const { getByText } = await render(withProviders(<TimelineScreen />));
    expect(getByText("Unknown category event")).toBeTruthy();
  });
});

// ── deleteLifeEvent onError guard ─────────────────────────────────────────
//
// The trash icon (accessibilityLabel="Delete event") triggers a confirmation
// Alert. Auto-confirming the destructive button calls deleteEvent.mutate(),
// which is configured to invoke onError immediately. The handler must call
// Alert.alert("Error", ...) rather than crashing.

describe("Timeline: deleteLifeEvent onError guard", () => {
  it("deleteLifeEvent mutation fires Alert on error, not a crash", async () => {
    mockApi.__setLifeEvents([
      {
        id: 5,
        title: "Event to delete",
        date: "2022-03-10",
        approximateDate: false,
        category: "other",
        description: null,
        mediaUrls: [],
      },
    ]);

    // Configure the delete spy to invoke onError immediately.
    const deleteSpy = mockApi.__getDeleteLifeEvent();
    deleteSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("delete failed"));
    });

    // Auto-confirm the "Delete Event" confirmation dialog so deleteEvent.mutate
    // is actually called (and onError fires).
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      buttons?.find((b: any) => b.style === "destructive")?.onPress?.();
    });

    const { getByLabelText } = await render(withProviders(<TimelineScreen />));

    // Press the trash button (accessibilityLabel added in task #83).
    fireEvent.press(getByLabelText("Delete event"));

    // The onError handler must call Alert.alert("Error", ...) — not crash.
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});

// ── createLifeEvent onError guard ─────────────────────────────────────────
//
// Real UI path:
//   1. Press "Add event" button (accessibilityLabel) → EventForm modal opens
//   2. Fill in title and date TextInputs (required for Save to be enabled)
//   3. Press "Save" → handleSave() → createEvent.mutate(...)
//   4. Spy invokes onError immediately → Alert.alert("Error", ...)

// ── createLifeEvent onError guard ─────────────────────────────────────────
//
// Real UI path:
//   1. Press "Add event" button → EventForm modal opens (title/date reset to "")
//   2. Type into title and date inputs using userEvent.type (RNTL v14 API)
//   3. Press "Save" → handleSave() → createEvent.mutate(...)
//   4. Spy invokes onError immediately → Alert.alert("Error", ...)
//
// fireEvent.changeText is deprecated in RNTL v14 and does not update state
// reliably; userEvent.type dispatches real keystroke events that flush state.

describe("Timeline: createLifeEvent onError guard", () => {
  it("createLifeEvent mutation fires Alert on error, not a crash", async () => {
    mockApi.__setLifeEvents([]);

    const createSpy = mockApi.__getCreateLifeEvent();
    createSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("create failed"));
    });

    const user = userEvent.setup();
    const { getByLabelText, getByPlaceholderText, getByText } = await render(
      withProviders(<TimelineScreen />)
    );

    // Open the event form via the header "+" button.
    await user.press(getByLabelText("Add event"));

    // Fill in the minimum required fields so the Save button is enabled.
    // userEvent.type dispatches real keystroke events and reliably updates state.
    await user.type(
      getByPlaceholderText("Graduated college, got married…"),
      "First job"
    );
    await user.type(getByPlaceholderText("YYYY-MM-DD"), "2015-06-01");

    // Press Save → handleSave() → createEvent.mutate() → onError fires.
    await user.press(getByText("Save"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});

// ── updateLifeEvent onError guard ─────────────────────────────────────────
//
// Real UI path:
//   1. Press "Edit event" button (accessibilityLabel) → EventForm opens prefilled
//   2. editingEvent is set, so title/date are already valid → Save button enabled
//   3. Press "Save" → handleSave() → updateEvent.mutate(...)
//   4. Spy invokes onError immediately → Alert.alert("Error", ...)

describe("Timeline: updateLifeEvent onError guard", () => {
  it("updateLifeEvent mutation fires Alert on error, not a crash", async () => {
    mockApi.__setLifeEvents([
      {
        id: 5,
        title: "Event to edit",
        date: "2022-03-10",
        approximateDate: false,
        category: "other",
        description: null,
        mediaUrls: [],
      },
    ]);

    const updateSpy = mockApi.__getUpdateLifeEvent();
    updateSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("update failed"));
    });

    const { getByLabelText, getByText } = await render(
      withProviders(<TimelineScreen />)
    );

    // Press the edit (pencil) button → EventForm opens with "Event to edit"
    // prefilled; title and date are already valid.
    // Use waitFor in case the FlatList item renders asynchronously.
    await waitFor(() => getByLabelText("Edit event"));
    fireEvent.press(getByLabelText("Edit event"));

    // Press Save → handleSave() → updateEvent.mutate() → onError fires.
    await waitFor(() => getByText("Save"));
    fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});
