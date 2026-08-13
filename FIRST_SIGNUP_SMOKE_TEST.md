# First Sign-Up Smoke Test Checklist

> **Purpose**: Ensure App Store reviewers (who create a brand-new account) can
> complete the full sign-up flow without seeing a blank screen, crash, or stall.
>
> Run this checklist on a **clean device or simulator** (fresh install, no
> existing account) before every App Store submission.

---

## Prerequisites

- [ ] Fresh install of the 333 Lives app (delete the existing app first, or use
      a new simulator)
- [ ] Device has network connectivity to the production API
- [ ] A throwaway email address ready (e.g. `reviewer+YYYYMMDD@gmail.com`)

---

## Stage 1 — Onboarding Slides

| Step | Action | Expected result |
|------|--------|-----------------|
| 1.1 | Launch the app | Splash screen appears, then **Slide 1 of 4** ("Welcome to 333 Lives") loads with icon and subtitle — **no blank screen** |
| 1.2 | Tap **Next** | Slide 2 ("Build Habits & Intentions") appears |
| 1.3 | Tap **Next** | Slide 3 ("Capture Your Story") appears |
| 1.4 | Tap **Next** | Slide 4 ("Stay Connected") appears; button label changes to **"Get Started"** |
| 1.5 | Tap **Get Started** | Navigates to the **Sign In** screen |

**Skip-to-last shortcut (optional)**

| Step | Action | Expected result |
|------|--------|-----------------|
| 1.6 | (Re-install) Launch → tap **Skip** | Jumps directly to Slide 4 ("Stay Connected") |
| 1.7 | Tap **Get Started** | Navigates to the **Sign In** screen |

---

## Stage 2 — Account Creation

| Step | Action | Expected result |
|------|--------|-----------------|
| 2.1 | On the Sign In screen tap **"Create an account"** | Sign Up screen loads — email, password, and confirm fields visible |
| 2.2 | Enter the throwaway email address | Field accepts input with no error |
| 2.3 | Enter a strong password (≥ 8 chars) | Field accepts input |
| 2.4 | Tap **Create account** | Verification email is sent; screen prompts for the 6-digit code |
| 2.5 | Enter the verification code from the email | Account is verified; app navigates automatically |

**Google SSO path (alternative)**

| Step | Action | Expected result |
|------|--------|-----------------|
| 2.6 | On Sign In tap **"Continue with Google"** | In-app browser or native Google sheet opens |
| 2.7 | Select or authenticate a Google account | Browser closes; app navigates to home |

---

## Stage 3 — JIT Provisioning & Home Screen

| Step | Action | Expected result |
|------|--------|-----------------|
| 3.1 | After sign-up completes, observe the transition | **No blank screen** — a loading indicator or the home tab appears within 3 seconds |
| 3.2 | Home / Today tab is visible | Intentions section shows **"No intentions set yet"** (empty state, not a crash) |
| 3.3 | Habits tab | Shows **"No habits yet"** empty state |
| 3.4 | Life tab | Shows empty timeline / life sections |
| 3.5 | Pulse tab | Shows empty feed |
| 3.6 | Profile / Settings | Shows the new user's name and email (provisioned from Clerk) |

---

## Stage 4 — Stress: Parallel First-Login Requests

> This stage verifies the concurrent-provisioning race condition fix.

| Step | Action | Expected result |
|------|--------|-----------------|
| 4.1 | (On the simulator) After sign-up, rapidly switch between tabs | All tabs load without a 500 error or blank screen |
| 4.2 | Background and foreground the app immediately after sign-up | App resumes on the home screen, not a blank screen |

---

## Stage 5 — Re-Launch (Returning User Gate)

| Step | Action | Expected result |
|------|--------|-----------------|
| 5.1 | Force-quit and re-launch the app | **Onboarding slides are NOT shown again** — app goes directly to the home screen |
| 5.2 | Sign out from Profile | App returns to Sign In screen |
| 5.3 | Sign back in with the same credentials | Home screen loads with the previously empty states intact |

---

## Failure Modes to Watch For

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Blank / white screen after splash | AsyncStorage read error or fonts not loaded | `_layout.tsx` useEffect `.catch()` + `useFonts` |
| Stuck on onboarding after Get Started | AsyncStorage `setItem` threw (storage full) | `onboarding.tsx` `handleGetStarted` — needs try/catch |
| 500 error on first API call | JIT provisioning race not recovered | `auth.ts` `resolveLocalUser` unique-violation handler |
| 401 on every call after sign-up | Clerk token not bridged to API client | `AuthTokenBridge` + `setAuthTokenGetter` |
| `/api/users/me` returns 404 | `requireAuth` middleware missing on route | `api-server/src/routes/users.ts` |
| Home screen crashes (not empty state) | Missing null-guard in a screen component | Screen-level crash-guard tests |

---

## Automated Tests That Cover This Flow

| Test file | What it covers |
|-----------|---------------|
| `artifacts/mobile/__tests__/first-signup-flow.test.tsx` | Onboarding gate (AsyncStorage success / failure / returning user), blank-screen guard |
| `artifacts/api-server/src/__tests__/jit-provisioning.test.ts` | JIT provisioning (new user, legacy link, concurrent race, 401, empty states) |
| `artifacts/mobile/__tests__/root-layout-auth-bridge.test.tsx` | AuthTokenBridge sets/clears token getter on sign-in/out |

Run all three before submitting:

```bash
# Mobile unit tests
pnpm --filter @workspace/mobile test

# API integration tests
pnpm --filter @workspace/api-server test
```
