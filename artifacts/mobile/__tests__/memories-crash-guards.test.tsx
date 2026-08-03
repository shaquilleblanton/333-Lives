/**
 * Crash-regression tests for the Memories screen.
 *
 * Covers the bugs fixed in task #80:
 *  - deleteItem mutation was missing onError → silent failure / potential crash
 *  - updateItem (caption save) mutation was missing onError → silent failure
 *
 * The deleteItem and updateItem onError tests exercise the real UI path:
 *   1. Press a collection card → AlbumView renders (conditional return)
 *   2. Long-press a photo item (shows action sheet Alert)
 *   3. Auto-confirm the appropriate action → mutation fires → spy calls onError
 *   4. Alert.alert("Error", ...) is asserted — not a crash
 *
 * Test ordering: clean-state tests FIRST so they don't inherit mock data
 * set by subsequent tests.
 */

import React from "react";
import { Alert } from "react-native";
import { render, act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  uploadAsync: jest.fn(() => Promise.resolve({ status: 200 })),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 500 })),
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

// Shared test fixtures
const testCollection = {
  id: 1,
  name: "Summer 2024",
  description: "Beach days",
  isInMemory: false,
  coverUrl: null,
};

const testPhotoItem = {
  id: 10,
  mediaUrl: "/photos/beach.jpg",
  type: "photo",
  caption: "Beach day",   // caption text is rendered in the UI — used as handle
  sortOrder: 0,
  createdAt: new Date().toISOString(),
};

let MemoriesScreen: React.ComponentType;
let mockApi: any;
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  MemoriesScreen = require("../app/(tabs)/memories").default;
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

// ── Empty state (run FIRST — clean mock state) ─────────────────────────────

describe("Memories: album grid — clean state", () => {
  it("renders empty state without crashing", async () => {
    // _collections already [] from __reset()
    const { getByText } = await render(withProviders(<MemoriesScreen />));
    expect(getByText("No albums yet")).toBeTruthy();
  });

  it("renders collection with all null optional fields without crashing", async () => {
    mockApi.__setCollections([
      {
        id: 10,
        name: "Untitled",
        description: null,      // optional
        isInMemory: false,
        coverUrl: null,         // no cover image
        personId: null,
      },
    ]);
    const { getByText } = await render(withProviders(<MemoriesScreen />));
    expect(getByText("Untitled")).toBeTruthy();
  });
});

// ── Album grid with data ───────────────────────────────────────────────────

describe("Memories: album grid — with collections", () => {
  it("renders collections list without crashing", async () => {
    mockApi.__setCollections([
      { id: 1, name: "Summer 2024", description: "Beach days", isInMemory: false, coverUrl: null },
      { id: 2, name: "Gran's Legacy", description: null, isInMemory: true, coverUrl: null },
    ]);
    const { getByText } = await render(withProviders(<MemoriesScreen />));
    expect(getByText("Summer 2024")).toBeTruthy();
    expect(getByText("Gran's Legacy")).toBeTruthy();
  });

  it("renders 'In Memory' badge without crashing", async () => {
    mockApi.__setCollections([
      { id: 3, name: "Dad's Stories", description: null, isInMemory: true, coverUrl: null },
    ]);
    const { getByText } = await render(withProviders(<MemoriesScreen />));
    expect(getByText("Dad's Stories")).toBeTruthy();
    expect(getByText("In Memory")).toBeTruthy();
  });
});

// ── deleteItem onError guard ───────────────────────────────────────────────
//
// Real UI path:
//   1. Press "Summer 2024" → MemoriesScreen returns <AlbumView> (state = activeCollection)
//   2. AlbumView renders photo items from _collectionItems
//   3. Long-press item caption "Beach day" → Alert action sheet [Edit Caption, Remove, Cancel]
//   4. Auto-confirm "Remove" (destructive) → handleDeleteItem(10) called
//   5. Alert "Remove Photo" confirmation → auto-confirm "Remove"
//   6. deleteItem.mutate() fires → spy calls onError → Alert.alert("Error", ...)
//
// The auto-confirm implementation presses the first destructive button on each
// Alert call, which chains through both confirmation dialogs automatically.

describe("Memories: deleteCollectionItem onError guard", () => {
  it("deleteCollectionItem mutation fires Alert on error, not a crash", async () => {
    mockApi.__setCollections([testCollection]);
    mockApi.__setCollectionItems([testPhotoItem]);

    // Configure the delete spy to invoke onError immediately.
    const deleteSpy = mockApi.__getDeleteCollectionItem();
    deleteSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("network error"));
    });

    // Auto-confirm any destructive button — chains through:
    //   call 1: "Remove" in long-press action sheet → triggers handleDeleteItem
    //   call 2: "Remove" in "Remove Photo" confirmation → triggers deleteItem.mutate
    //   call 3 (from onError): "Error" alert with no buttons → no-op auto-confirm
    alertSpy.mockImplementation((_title: string, _msg: string, buttons: any[]) => {
      buttons?.find((b: any) => b.style === "destructive")?.onPress?.();
    });

    const { getByText } = await render(withProviders(<MemoriesScreen />));

    // Press the collection card to open AlbumView.
    fireEvent.press(getByText("Summer 2024"));

    // AlbumView renders — wait for the photo item caption to appear.
    await waitFor(() => getByText("Beach day"));

    // Long-press the photo item caption to trigger the action sheet.
    fireEvent(getByText("Beach day"), "longPress");

    // The chain: Remove → handleDeleteItem → Remove Photo → deleteItem.mutate
    // → spy calls onError → Alert.alert("Error", ...)
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});

// ── updateItem (caption save) onError guard ───────────────────────────────
//
// Real UI path:
//   1. Press collection → AlbumView
//   2. Long-press item caption → Alert action sheet
//   3. Auto-invoke "Edit Caption" → setCaptionEdit → caption modal appears
//   4. Press the "Save" button → updateItem.mutate() → spy calls onError
//   5. Alert.alert("Error", ...) is asserted

describe("Memories: updateCollectionItem onError guard (caption save)", () => {
  it("updateCollectionItem mutation fires Alert on error, not a crash", async () => {
    mockApi.__setCollections([testCollection]);
    mockApi.__setCollectionItems([testPhotoItem]);

    // Configure the update spy to invoke onError immediately.
    const updateSpy = mockApi.__getUpdateCollectionItem();
    updateSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("save failed"));
    });

    // First Alert call (action sheet): press "Edit Caption" (not destructive)
    // to open the caption editor modal.
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      buttons?.find((b: any) => b.text === "Edit Caption")?.onPress?.();
    });
    // Subsequent Alert calls (from onError): no-op so we can assert on them.
    alertSpy.mockImplementation(() => {});

    const { getByText } = await render(withProviders(<MemoriesScreen />));

    // Open the AlbumView.
    fireEvent.press(getByText("Summer 2024"));
    await waitFor(() => getByText("Beach day"));

    // Long-press to open action sheet → auto-invoke "Edit Caption".
    fireEvent(getByText("Beach day"), "longPress");

    // Caption edit modal appears with a "Save" button.
    await waitFor(() => getByText("Save"));

    // Press "Save" → handleSaveCaption() → updateItem.mutate() → onError fires.
    fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});
