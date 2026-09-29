import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockSignInPassword = jest.fn();
const mockStartSSOFlow = jest.fn();
const mockRouterPush = jest.fn();
const mockSignInContext: any = {};

jest.mock("@clerk/expo", () => ({
  useSignIn: () => mockSignInContext,
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "exp://localhost"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
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

import SignInScreen from "../app/(auth)/sign-in";

describe("sign-in Google age affirmation", () => {
  beforeEach(() => {
    mockSignInPassword.mockReset().mockResolvedValue({ error: null });
    mockStartSSOFlow.mockReset().mockResolvedValue({ createdSessionId: null });
    mockRouterPush.mockReset();
    Object.assign(mockSignInContext, {
      signIn: { status: null, password: mockSignInPassword, finalize: jest.fn() },
      errors: { fields: {}, global: [] },
      fetchStatus: "idle",
    });
  });

  it("does not start Google SSO until the age checkbox is affirmed", async () => {
    const screen = await render(<SignInScreen />);

    expect(screen.getByTestId("signin-google").props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("signin-google"));
    expect(mockStartSSOFlow).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("google-age-affirmation"));
    expect(screen.getByTestId("signin-google").props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId("signin-google"));

    await waitFor(() => expect(mockStartSSOFlow).toHaveBeenCalledWith({
      strategy: "oauth_google",
      redirectUrl: "exp://localhost",
    }));
  });

  it("does not require the Google age checkbox for password sign-in", async () => {
    const screen = await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "person@example.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Your password"), "valid-password");
    await fireEvent.press(screen.getByTestId("signin-email-submit"));

    await waitFor(() => expect(mockSignInPassword).toHaveBeenCalledWith({
      emailAddress: "person@example.com",
      password: "valid-password",
    }));
    expect(mockStartSSOFlow).not.toHaveBeenCalled();
  });
});