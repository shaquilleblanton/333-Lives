import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react", () => ({
  SignIn: () => <div>Clerk sign in</div>,
  SignUp: () => <div>Clerk sign up</div>,
}));
vi.mock("@/lib/clerk", () => ({ basePath: "" }));

import { readAgeEligibility, saveAgeEligibility, SignUpPage } from "./auth";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal("sessionStorage", storage);
});
afterEach(() => vi.unstubAllGlobals());

describe("web sign-up age gate", () => {
  it("keeps Clerk's email and social sign-up hidden until age is affirmed", () => {
    const html = renderToStaticMarkup(<SignUpPage />);
    expect(html).toContain("Continue to sign up");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Clerk sign up");
  });

  it("allows sign-up after affirmation and remembers it for OAuth callbacks in this tab", () => {
    expect(saveAgeEligibility("eligible")).toBe(true);
    expect(readAgeEligibility()).toBe("eligible");
    expect(renderToStaticMarkup(<SignUpPage />)).toContain("Clerk sign up");
  });

  it("blocks sign-up after the user indicates they are under the minimum age", () => {
    expect(saveAgeEligibility("ineligible")).toBe(true);
    const html = renderToStaticMarkup(<SignUpPage />);
    expect(html).toContain("You cannot create an account yet");
    expect(html).not.toContain("Clerk sign up");
  });

  it("fails closed when the session cannot store the affirmation", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => { throw new Error("Storage blocked"); },
      setItem: () => { throw new Error("Storage blocked"); },
    });
    expect(saveAgeEligibility("eligible")).toBe(false);
    expect(readAgeEligibility()).toBe("unanswered");
    expect(renderToStaticMarkup(<SignUpPage />)).not.toContain("Clerk sign up");
  });
});