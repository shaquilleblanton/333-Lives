/**
 * Crash-regression tests for the Family Tree screen.
 *
 * Covers the bug fixed in task #80:
 *  - deleteFamilyMemberMoment was missing onError → silent failure / potential crash
 *
 * The deleteMoment onError test exercises the real UI path:
 *   1. Press a member card → opens MomentDetail modal
 *   2. Press the "Delete moment" trash button (accessibilityLabel)
 *   3. The spy fires onError → Alert.alert("Error", ...) is asserted
 *
 * This confirms the onError handler is wired in production code, not a no-op.
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

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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

let FamilyTreeScreen: React.ComponentType;
let mockApi: ReturnType<typeof require>;
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  FamilyTreeScreen = require("../app/(tabs)/life/family-tree").default;
});

beforeEach(() => {
  mockApi.__reset();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

// ── Empty state ────────────────────────────────────────────────────────────

describe("FamilyTree: empty state renders without crash", () => {
  it("shows empty family tree message when no members exist", async () => {
    mockApi.__setFamilyMembers([]);
    const { getByText } = await render(withProviders(<FamilyTreeScreen />));
    expect(getByText("Family Tree")).toBeTruthy();
  });
});

// ── Member list renders safely ─────────────────────────────────────────────

describe("FamilyTree: member list renders without crash", () => {
  it("renders members in list view without crashing", async () => {
    mockApi.__setFamilyMembers([
      {
        id: 1,
        name: "Mary Running Bear",
        relation: "grandparent",
        birthDate: "1920-03-15",
        deathDate: "1995-08-22",
        photoUrl: null,
        birthplace: "Tahlequah, Oklahoma",
        affiliation: "Cherokee Nation",
        notes: "Strong and wise.",
      },
      {
        id: 2,
        name: "John Doe",
        relation: "parent",
        birthDate: "1950-01-01",
        deathDate: null,
        photoUrl: null,
        birthplace: null,
        affiliation: null,
        notes: null,
      },
    ]);

    const { getByText } = await render(withProviders(<FamilyTreeScreen />));
    expect(getByText("Mary Running Bear")).toBeTruthy();
    expect(getByText("John Doe")).toBeTruthy();
  });

  it("renders member with deathDate showing 'In memory' badge without crashing", async () => {
    mockApi.__setFamilyMembers([
      {
        id: 3,
        name: "Grandma Rose",
        relation: "grandparent",
        birthDate: "1930-06-01",
        deathDate: "2010-12-25",
        photoUrl: null,
        birthplace: null,
        affiliation: null,
        notes: null,
      },
    ]);

    const { getByText } = await render(withProviders(<FamilyTreeScreen />));
    expect(getByText("Grandma Rose")).toBeTruthy();
    expect(getByText("In memory")).toBeTruthy();
  });

  it("renders member with unknown relation without crashing", async () => {
    // RELATION_LABELS lookup must fall back gracefully for unrecognised values
    mockApi.__setFamilyMembers([
      {
        id: 4,
        name: "Unknown Relation",
        relation: "future_relation_type",
        birthDate: null,
        deathDate: null,
        photoUrl: null,
        birthplace: null,
        affiliation: null,
        notes: null,
      },
    ]);

    const { getByText } = await render(withProviders(<FamilyTreeScreen />));
    expect(getByText("Unknown Relation")).toBeTruthy();
  });

  it("getInitials handles single-word name without crashing", async () => {
    // getInitials("Cher") → ["Cher"][0][0] = "C" — should not crash
    mockApi.__setFamilyMembers([
      {
        id: 5,
        name: "Cher",
        relation: "other",
        birthDate: null,
        deathDate: null,
        photoUrl: null,
        birthplace: null,
        affiliation: null,
        notes: null,
      },
    ]);

    const { getByText } = await render(withProviders(<FamilyTreeScreen />));
    expect(getByText("Cher")).toBeTruthy();
  });
});

// ── deleteMoment onError guard ─────────────────────────────────────────────
//
// Real UI path:
//   1. Press the member card ("Grandma") → setDetailMember → MomentDetail modal opens
//   2. Moment list is shown (from _familyMoments mock state)
//   3. Press "Delete moment" trash button (accessibilityLabel added in task #83)
//   4. deleteMoment.mutate() fires → spy invokes onError immediately
//   5. Alert.alert("Error", ...) is called — not a crash

describe("FamilyTree: deleteFamilyMemberMoment onError guard", () => {
  it("deleteMoment mutation fires Alert on error, not a crash", async () => {
    const member = {
      id: 10,
      name: "Grandma",
      relation: "grandparent",
      birthDate: "1930-01-01",
      deathDate: null,
      photoUrl: null,
      birthplace: null,
      affiliation: null,
      notes: null,
    };
    mockApi.__setFamilyMembers([member]);
    mockApi.__setFamilyMoments([
      {
        id: 5,
        title: "Birthday party",
        date: "2020-06-15",
        type: "milestone",
        description: null,
        mediaUrl: null,
      },
    ]);

    // Configure the spy to invoke onError immediately when mutate is called.
    const deleteMomentSpy = mockApi.__getDeleteMoment();
    deleteMomentSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("delete failed"));
    });

    const { getByText, getByLabelText } = await render(
      withProviders(<FamilyTreeScreen />)
    );

    // Press the member card to open MomentDetail modal.
    fireEvent.press(getByText("Grandma"));

    // Wait for the moment list to appear inside the detail modal.
    await waitFor(() => getByText("Birthday party"));

    // Press the trash button on the moment (accessibilityLabel added in task #83).
    fireEvent.press(getByLabelText("Delete moment"));

    // The onError handler must call Alert.alert("Error", ...) — not crash.
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Error", expect.any(String))
    );
  });
});

// ── deleteFamilyMember onError guard ──────────────────────────────────────
//
// Real UI path:
//   1. Press "Remove member" trash button on the MemberCard (accessibilityLabel)
//   2. confirmDelete() fires → Alert "Remove member?" confirmation dialog
//   3. Auto-confirm the destructive button → deleteMember.mutateAsync() called
//   4. Spy (mutateAsync) rejects → catch block → Alert.alert("Couldn't remove", ...)
//
// family-tree.tsx uses mutateAsync (not mutate) inside a try/catch, so the
// error path is the catch block — Alert title is "Couldn't remove".

describe("FamilyTree: deleteFamilyMember onError guard", () => {
  it("deleteMember failure shows alert, not a crash", async () => {
    mockApi.__setFamilyMembers([
      {
        id: 6,
        name: "Test Member",
        relation: "other",
        birthDate: null,
        deathDate: null,
        photoUrl: null,
        birthplace: null,
        affiliation: null,
        notes: null,
      },
    ]);

    // Configure the spy (shared by mutate and mutateAsync) to reject.
    const deleteMemberSpy = mockApi.__getDeleteMember();
    deleteMemberSpy.mockImplementation(() => Promise.reject(new Error("delete failed")));

    // Auto-confirm the "Remove member?" confirmation dialog so
    // deleteMember.mutateAsync() is actually called.
    alertSpy.mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      buttons?.find((b: any) => b.style === "destructive")?.onPress?.();
    });

    const { getByLabelText } = await render(withProviders(<FamilyTreeScreen />));

    // Press the trash button on the MemberCard (accessibilityLabel added in task #83).
    fireEvent.press(getByLabelText("Remove member"));

    // The catch block fires Alert.alert("Couldn't remove", ...) after the
    // async rejection settles.
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Couldn't remove", expect.any(String))
    );
  });
});
