import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockPassword = jest.fn();
const mockSendEmailCode = jest.fn();
const mockStartSSOFlow = jest.fn();
const mockRouterPush = jest.fn();
const mockSignUpContext: any = {};

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isSignedIn: false }),
  useSignUp: () => mockSignUpContext,
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "exp://localhost"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/KeyboardAwareScrollViewCompat", () => ({
  KeyboardAwareScrollViewCompat: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/constants/fonts", () => ({
  fonts: {
    serifBold: "serifBold",
    serif: "serif",
    sub: "sub",
    subSemibold: "subSemibold",
    body: "body",
    bodySemibold: "bodySemibold",
  },
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#191919",
    foreground: "#F5F5F5",
    mutedForeground: "#888",
    primary: "#C9A439",
    primaryForeground: "#000",
    card: "#222",
    border: "#333",
    destructive: "#E53E3E",
  }),
}));

jest.mock("../app/(auth)/sign-in", () => ({
  useWarmUpBrowser: jest.fn(),
}));

import SignUpScreen from "../app/(auth)/sign-up";

describe("sign-up age affirmation", () => {
  beforeEach(() => {
    mockPassword.mockReset().mockResolvedValue({ error: null });
    mockSendEmailCode.mockReset().mockResolvedValue(undefined);
    mockStartSSOFlow.mockReset().mockResolvedValue({ createdSessionId: null });
    mockRouterPush.mockReset();
    Object.assign(mockSignUpContext, {
      signUp: {
        status: null,
        unverifiedFields: [],
        missingFields: [],
        password: mockPassword,
        verifications: { sendEmailCode: mockSendEmailCode },
      },
      errors: { fields: {}, global: [] },
      fetchStatus: "idle",
    });
  });

  it("blocks an under-minimum-age choice and offers a sign-in path", async () => {
    const screen = await render(<SignUpScreen />);
    await fireEvent.press(screen.getByTestId("under-minimum-age"));

    expect(screen.getByTestId("underage-message")).toBeTruthy();
    expect(screen.getByText("Go to sign in")).toBeTruthy();
    expect(screen.getByTestId("signup-email-submit").props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId("signup-google").props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("age-affirmation"));
    expect(screen.getByTestId("signup-email-submit").props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId("signup-google").props.accessibilityState?.disabled).toBe(true);
    expect(mockPassword).not.toHaveBeenCalled();
    expect(mockStartSSOFlow).not.toHaveBeenCalled();
  });

  it("does not call either sign-up method while affirmation is unchecked", async () => {
    const screen = await render(<SignUpScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "person@example.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Choose a password"), "valid-password");
    await fireEvent.press(screen.getByTestId("signup-email-submit"));
    await fireEvent.press(screen.getByTestId("signup-google"));

    expect(screen.getByTestId("signup-email-submit").props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId("signup-google").props.accessibilityState?.disabled).toBe(true);
    expect(mockPassword).not.toHaveBeenCalled();
    expect(mockStartSSOFlow).not.toHaveBeenCalled();
  });

  it("allows eligible email sign-up after explicit affirmation", async () => {
    const screen = await render(<SignUpScreen />);
    await fireEvent.press(screen.getByTestId("age-affirmation"));
    await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "person@example.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Choose a password"), "valid-password");
    await fireEvent.press(screen.getByTestId("signup-email-submit"));

    await waitFor(() => {
      expect(mockPassword).toHaveBeenCalledWith({
        emailAddress: "person@example.com",
        password: "valid-password",
      });
      expect(mockSendEmailCode).toHaveBeenCalled();
    });
  });

  it("allows eligible Google sign-up after explicit affirmation", async () => {
    const screen = await render(<SignUpScreen />);
    await fireEvent.press(screen.getByTestId("age-affirmation"));
    await fireEvent.press(screen.getByTestId("signup-google"));

    await waitFor(() => expect(mockStartSSOFlow).toHaveBeenCalledWith({
      strategy: "oauth_google",
      redirectUrl: "exp://localhost",
    }));
    expect(mockPassword).not.toHaveBeenCalled();
  });

  it("keeps a pending email verification/resume path available without a fresh affirmation", async () => {
    mockSignUpContext.signUp.status = "missing_requirements";
    mockSignUpContext.signUp.unverifiedFields = ["email_address"];
    mockSignUpContext.signUp.missingFields = [];
    const screen = await render(<SignUpScreen />);

    expect(screen.getByText("Check your email")).toBeTruthy();
    expect(screen.queryByTestId("age-affirmation")).toBeNull();
  });
});