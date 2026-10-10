import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import InstructionsScreen from "../app/instructions";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
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
    mockRouter.push.mockClear();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("covers the daily practice, story, life hub, sharing, legacy, and privacy features", async () => {
    const { getByText, getByTestId } = await render(<InstructionsScreen />);

    expect(getByText("Today · The 333 Method")).toBeTruthy();
    expect(getByText("Gratitude")).toBeTruthy();
    expect(getByText("Streak")).toBeTruthy();
    expect(getByText("Habits")).toBeTruthy();
    expect(getByText("Goals")).toBeTruthy();
    expect(getByText("Journal")).toBeTruthy();
    expect(getByText("Life Coach, Affirmations & AI Chat")).toBeTruthy();
    expect(getByText("Memos")).toBeTruthy();
    expect(getByText("Memories")).toBeTruthy();
    expect(getByText("Life Timeline")).toBeTruthy();
    expect(getByText("Tell Your Story")).toBeTruthy();
    expect(getByText("Tasks")).toBeTruthy();
    expect(getByText("My Circle")).toBeTruthy();
    expect(getByText("Schedule")).toBeTruthy();
    expect(getByText("Workouts")).toBeTruthy();
    expect(getByText("What's Good")).toBeTruthy();
    expect(getByText("Community")).toBeTruthy();
    expect(getByText("Family Tree")).toBeTruthy();
    expect(getByText("Legacy Letters")).toBeTruthy();
    expect(getByText("Future Messages")).toBeTruthy();
    expect(getByText("Secure Vault")).toBeTruthy();
    expect(getByText("Review")).toBeTruthy();
    expect(getByText("Profile, Help & Privacy")).toBeTruthy();

    fireEvent.press(getByTestId("instructions-back"));
    expect(mockRouter.back).toHaveBeenCalled();

    fireEvent.press(getByTestId("instructions-help"));
    expect(mockRouter.push).toHaveBeenCalledWith("/help");
  });
});