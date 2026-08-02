/**
 * Crash-regression tests for AuthTokenBridge.
 *
 * Imports the REAL AuthTokenBridge component from components/AuthTokenBridge.tsx
 * so that any future change to its implementation is caught immediately.
 *
 * @clerk/expo is mocked so useAuth() state is fully controlled per test.
 * @workspace/api-client-react is mocked so setAuthTokenGetter() is observable.
 *
 * Covers the auth token race fixed in task #80:
 *  - AuthTokenBridge must call setAuthTokenGetter(getToken) when signed in
 *  - AuthTokenBridge must call setAuthTokenGetter(null) when signed out
 *  - The bridge updates when isSignedIn or getToken changes
 *  - The bridge renders null (no UI) — it's a side-effect-only component
 *
 * Key RNTL v14 notes:
 *  - render() is async — must be awaited to get rerender/toJSON/queries
 *  - waitFor polls via internal act batches, reliably flushing useEffect
 */

import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────
// Both must be declared before the component import so they are in place when
// AuthTokenBridge's module-level dependencies are resolved.

jest.mock("@clerk/expo", () => ({
  // useAuth is a jest.fn() so tests can call .mockReturnValue() per scenario.
  useAuth: jest.fn(() => ({ isSignedIn: false, getToken: jest.fn() })),
}));

jest.mock("@workspace/api-client-react", () => ({
  setAuthTokenGetter: jest.fn(),
}));

// ── Real component import ──────────────────────────────────────────────────
// Resolved AFTER mocks; gets the live implementation from the components/ dir.

import { AuthTokenBridge } from "../components/AuthTokenBridge";

// ── Per-test helpers ───────────────────────────────────────────────────────

function getUseAuth() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@clerk/expo").useAuth as jest.Mock;
}

function getSetAuthTokenGetter() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@workspace/api-client-react").setAuthTokenGetter as jest.Mock;
}

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
  // Restore default return value so each test starts clean.
  getUseAuth().mockImplementation(() => ({ isSignedIn: false, getToken: jest.fn() }));
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AuthTokenBridge: setAuthTokenGetter behavior", () => {
  it("calls setAuthTokenGetter with getToken when user is signed in", async () => {
    const getToken = jest.fn(async () => "tok123");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });

    await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenCalledWith(getToken)
    );
    expect(getSetAuthTokenGetter()).not.toHaveBeenCalledWith(null);
  });

  it("calls setAuthTokenGetter with null when user is signed out", async () => {
    const getToken = jest.fn();
    getUseAuth().mockReturnValue({ isSignedIn: false, getToken });

    await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenCalledWith(null)
    );
  });

  it("updates the getter when isSignedIn changes from false to true", async () => {
    const getToken = jest.fn(async () => "new-token");
    getUseAuth().mockReturnValue({ isSignedIn: false, getToken });

    const { rerender } = await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(null)
    );

    // Simulate sign-in by updating what useAuth returns.
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });
    await rerender(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(getToken)
    );
  });

  it("clears the getter when isSignedIn changes from true to false (sign-out)", async () => {
    const getToken = jest.fn(async () => "token");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });

    const { rerender } = await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(getToken)
    );

    // Simulate sign-out — clearing the getter prevents 401s on unauthenticated
    // API calls that React Query might retry in the background.
    getUseAuth().mockReturnValue({ isSignedIn: false, getToken });
    await rerender(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(null)
    );
  });

  it("updates the getter reference when getToken function changes", async () => {
    const getToken1 = jest.fn(async () => "token-v1");
    const getToken2 = jest.fn(async () => "token-v2");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken: getToken1 });

    const { rerender } = await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(getToken1)
    );

    getUseAuth().mockReturnValue({ isSignedIn: true, getToken: getToken2 });
    await rerender(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenLastCalledWith(getToken2)
    );
  });
});

describe("AuthTokenBridge: lifecycle guarantees", () => {
  it("bridge fires exactly once on mount when signed in", async () => {
    const getToken = jest.fn(async () => "tok");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });

    await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenCalledTimes(1)
    );
    expect(getSetAuthTokenGetter()).toHaveBeenCalledWith(getToken);
  });

  it("returns null — does not render visible UI (no window where token getter is missing)", async () => {
    const getToken = jest.fn(async () => "tok");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });

    const { toJSON } = await render(<AuthTokenBridge />);

    await waitFor(() => expect(getSetAuthTokenGetter()).toHaveBeenCalled());

    // AuthTokenBridge renders nothing — it's a side-effect-only component.
    // This ensures there's no rendered subtree that could interfere with
    // tab navigation or accidentally unmount/remount the bridge.
    expect(toJSON()).toBeNull();
  });

  it("does not call setter again on re-render with same props (no unnecessary token churn)", async () => {
    const getToken = jest.fn(async () => "tok");
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken });

    const { rerender } = await render(<AuthTokenBridge />);

    await waitFor(() =>
      expect(getSetAuthTokenGetter()).toHaveBeenCalledTimes(1)
    );

    // Re-render with identical values — useEffect deps [isSignedIn, getToken]
    // haven't changed, so the effect must NOT run again.
    getUseAuth().mockReturnValue({ isSignedIn: true, getToken }); // same ref
    await rerender(<AuthTokenBridge />);

    // Brief wait to let any spurious effects settle.
    await new Promise(r => setTimeout(r, 50));
    expect(getSetAuthTokenGetter()).toHaveBeenCalledTimes(1);
  });
});
