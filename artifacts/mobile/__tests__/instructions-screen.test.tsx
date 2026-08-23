import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import InstructionsScreen from "../app/instructions";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
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
    secondary: "#8A8A8F",
    accent: "#93C5FD",
    muted: "#2A2A2E",
    mutedForeground: "#8A8A8F",
    border: "#333338",
  }),
}));

const mockRouter = require("expo-router").router;

describe("Instructions screen", () => {
  beforeEach(() => {
    mockRouter.back.mockClear();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("explains every core feature and supports back navigation", async () => {
    const { getByText, getByTestId } = await render(<InstructionsScreen />);

    expect(getByText("Today · The 333 Method")).toBeTruthy();
    expect(getByText("Streak")).toBeTruthy();
    expect(getByText("Memos")).toBeTruthy();
    expect(getByText("Vault")).toBeTruthy();
    expect(getByText("Pulse")).toBeTruthy();
    expect(getByText("Family")).toBeTruthy();

    fireEvent.press(getByTestId("instructions-back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});