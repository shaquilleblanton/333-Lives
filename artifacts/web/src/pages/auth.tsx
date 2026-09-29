import { SignIn, SignUp } from "@clerk/react";
import React, { useState } from "react";
import { basePath } from "@/lib/clerk";

type AgeEligibility = "unanswered" | "eligible" | "ineligible";
const AGE_ELIGIBILITY_KEY = "333-lives-sign-up-age-eligibility";

export function readAgeEligibility(): AgeEligibility {
  try {
    const value = sessionStorage.getItem(AGE_ELIGIBILITY_KEY);
    return value === "eligible" || value === "ineligible" ? value : "unanswered";
  } catch {
    return "unanswered";
  }
}

export function saveAgeEligibility(value: Exclude<AgeEligibility, "unanswered">): boolean {
  try {
    sessionStorage.setItem(AGE_ELIGIBILITY_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      {/* path must be the full browser path — Clerk reads window.location.pathname directly */}
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

export function SignUpPage() {
  const [eligibility, setEligibility] = useState<AgeEligibility>(readAgeEligibility);
  const [affirmed, setAffirmed] = useState(false);
  const [storageError, setStorageError] = useState(false);

  if (eligibility === "ineligible") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">You cannot create an account yet</h1>
          <p className="mt-4 text-muted-foreground">
            333 Lives is for people aged 13 or older, or 16 or older in the European Economic Area.
          </p>
          <a className="mt-6 inline-block text-primary underline" href={`${basePath}/sign-in`}>Back to sign in</a>
        </div>
      </main>
    );
  }

  if (eligibility !== "eligible") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold text-foreground">Before you sign up</h1>
          <p className="mt-3 text-muted-foreground">Please confirm you meet the minimum age for 333 Lives.</p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-foreground">
            <input
              aria-label="I meet the minimum age"
              className="mt-1 h-4 w-4 accent-amber-500"
              type="checkbox"
              checked={affirmed}
              onChange={(event) => setAffirmed(event.target.checked)}
            />
            <span>I am at least 13 years old, and at least 16 if I live in the European Economic Area.</span>
          </label>
          <button
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!affirmed}
            onClick={() => {
              if (!affirmed) return;
              if (saveAgeEligibility("eligible")) setEligibility("eligible");
              else setStorageError(true);
            }}
            type="button"
          >
            Continue to sign up
          </button>
          {storageError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              We couldn&apos;t save your confirmation for this sign-up session. Enable session storage and try again.
            </p>
          )}
          <button
            className="mt-4 w-full text-sm text-muted-foreground underline"
            onClick={() => {
              saveAgeEligibility("ineligible");
              setEligibility("ineligible");
            }}
            type="button"
          >
            I do not meet this age requirement
          </button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <a className="text-primary underline" href={`${basePath}/sign-in`}>Sign in</a>
            {" · "}
            <a className="text-primary underline" href={`${basePath}/privacy-policy`}>Privacy policy</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}
