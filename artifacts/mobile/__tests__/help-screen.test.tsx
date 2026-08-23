import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";

import HelpScreen from "../app/help";
import { WEB_URLS } from "../constants/links";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#191919",
    foreground: "#F7F4EF",
    card: "#1F1F23",
    primary: "#C9A439",
    muted: "#2A2A2E",
    mutedForeground: "#8A8A8F",
    border: "#333338",
  }),
}));

const mockRouter = require("expo-router").router;

describe("Help screen", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
    (Linking.openURL as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("shows all support resources and opens the canonical privacy page", async () => {
    const { getByText, getByTestId } = await render(<HelpScreen />);

    expect(getByText("Help Center")).toBeTruthy();
    expect(getByText("Browse full Help Center")).toBeTruthy();
    expect(getByText("Privacy Policy")).toBeTruthy();
    expect(getByText("Terms of Service")).toBeTruthy();
    expect(getByText("Contact Support")).toBeTruthy();

    fireEvent.press(getByTestId("help-privacy"));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(WEB_URLS.privacy);
    });
  });

  it("links to the in-app orientation guide and supports back navigation", async () => {
    const { getByTestId } = await render(<HelpScreen />);

    fireEvent.press(getByTestId("help-instructions"));
    expect(mockRouter.push).toHaveBeenCalledWith("/instructions");

    fireEvent.press(getByTestId("help-back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});