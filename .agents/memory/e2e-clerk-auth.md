---
name: E2E auth for Clerk proxy mode
description: How to get a Playwright testing agent past Clerk auth in this project (proxy mode breaks programmatic login)
---

**Rule:** The web app runs Clerk with `proxyUrl` (frontend API proxied through the api-server). The testing harness's programmatic Clerk login sets cookies against Clerk's own domain and does NOT reliably sync into the proxied client — the app renders logged-out despite `__clerk_db_jwt`/`__client_uat` cookies being present.

**What works:** Create a backend sign-in token (`POST /v1/sign_in_tokens` with the Clerk secret) and have the tester open `/sign-in?__clerk_ticket=<token>`. Bypasses password AND new-device verification. Tokens are single-use — the tester must reuse the signed-in context across passes, or mint a new token.

**Dead ends to skip next time:**
- `+clerk_test` emails + code 424242 do NOT satisfy the new-device ("client trust") verification step — only a real inbox or a sign-in token does.
- Password sign-in via the app UI triggers device verification for fresh browser contexts.
- React Native Web forms: programmatic `fill()` doesn't fire `onChangeText`, leaving controlled state empty and submit buttons disabled — testers must type with real keystrokes.
- The Expo dev domain serves only the mobile bundle; if a tester reports the web app's UI there, its tabs/session got crossed during cross-domain auth — don't chase phantom routing bugs.

**How to apply:** Any e2e sweep of this project's web or Expo-web surfaces; also relevant to future Clerk-proxied apps.
