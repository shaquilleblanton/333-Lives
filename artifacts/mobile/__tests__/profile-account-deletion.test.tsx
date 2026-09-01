import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/contexts/ThemeContext", () => ({
  THEMES: [{ id: "charcoal", label: "Charcoal", preview: ["#191919", "#c9a439", "#8fa67a"] }],
  useTheme: () => ({
    palette: {
      background: "#191919",
      foreground: "#f7f4ef",
      card: "#222",
      mutedForeground: "#999",
      border: "#333",
      primary: "#c9a439",
      primaryForeground: "#191919",
      destructive: "#e05c5c",
    },
    theme: "charcoal",
    setTheme: jest.fn(),
  }),
}));
jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#191919",
    foreground: "#f7f4ef",
    card: "#222",
    mutedForeground: "#999",
    border: "#333",
    primary: "#c9a439",
    primaryForeground: "#191919",
    destructive: "#e05c5c",
  }),
}));
jest.mock("@workspace/api-client-react", () => require("./__mocks__/api-client-react"));

import ProfileScreen from "../app/(tabs)/profile";
import {
  __getDeleteAccount,
  __reset,
} from "./__mocks__/api-client-react";

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const clear = jest.spyOn(client, "clear");
  return { screen: await render(<QueryClientProvider client={client}><ProfileScreen /></QueryClientProvider>), clear };
}

describe("Profile account deletion", () => {
  beforeEach(() => {
    __reset();
    mockSignOut.mockClear();
    jest.spyOn(Alert, "alert").mockClear();
  });

  it("requires typed confirmation, then clears local state and signs out after success", async () => {
    const { screen, clear } = await renderScreen();
    const { getByText, getByTestId } = screen;

    fireEvent.press(getByTestId("delete-account-menu-item"));
    await waitFor(() => expect(getByText("Type DELETE to confirm.")).toBeTruthy());
    expect(getByTestId("delete-account-submit").props.accessibilityState?.disabled).toBeTruthy();

    fireEvent.changeText(getByTestId("delete-account-confirmation"), "DELETE");
    await waitFor(() => expect(getByTestId("delete-account-submit").props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(getByTestId("delete-account-submit"));

    await waitFor(() => expect(__getDeleteAccount()).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when account deletion fails", async () => {
    __getDeleteAccount().mockRejectedValueOnce(new Error("network"));
    const { screen } = await renderScreen();
    const { getByTestId } = screen;

    fireEvent.press(getByTestId("delete-account-menu-item"));
    await waitFor(() => expect(getByTestId("delete-account-confirmation")).toBeTruthy());
    fireEvent.changeText(getByTestId("delete-account-confirmation"), "DELETE");
    await waitFor(() => expect(getByTestId("delete-account-submit").props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(getByTestId("delete-account-submit"));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      "Couldn't delete account",
      expect.stringContaining("still signed in"),
    ));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});