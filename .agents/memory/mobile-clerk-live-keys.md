---
name: Mobile builds need live Clerk keys
description: TestFlight/store builds must bake the production Clerk publishable key; pk_test against a live-key API = every request 401s
---

**Rule:** A store/TestFlight mobile build must ship the **live** Clerk publishable key (`pk_live_…`) when it points at the published API. Replit-managed Clerk swaps server keys to live on publish, but anything baked into a native binary (eas.json `build.production.env`) is our responsibility — the swap cannot reach it.

**Why:** Every early TestFlight build shipped `pk_test_…` while targeting the published API. Sign-up *appeared* to work (client talks to the dev instance directly), then every API call was rejected — token minted by dev instance, verified against live secret. Looked like "app totally broken" to testers, invisible on web-dev, web-prod, and Expo dev, because only the native binary had the mismatch. Diagnosed July 2026.

**How to verify which instance production really uses:** grep the deployed web bundle for `pk_(test|live)_[A-Za-z0-9=]+` — the publishable key is public and baked at deploy build time. Cross-check: Clerk Backend API user list (workspace `CLERK_SECRET_KEY` = **test** instance only) vs `users` rows in the prod DB (live-instance signups). Signups stranded in the dev instance while prod DB stays near-empty = binary/key mismatch.

**How to apply:** Before any production mobile build: confirm `eas.json` `build.production.env` carries the pk_live key, prod domain, AND `EXPO_PUBLIC_CLERK_PROXY_URL=https://<domain>/api/__clerk`. The live publishable key for this app decodes to `clerk.333lives.app$` and that DNS is configured (CNAME to Clerk's frontend API). Dev builds keep pk_test — correct and expected.

**Proxy, not direct FAPI:** The canonical Replit-managed Clerk mobile setup passes `proxyUrl={process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined}` on `ClerkProvider` — in prod the native app must talk to Clerk through the app's own API proxy (`/api/__clerk`, hardcoded path), the same proven path the prod website uses. Direct calls to `clerk.<domain>` from native can be rejected (Cloudflare bot checks, native-app allowlisting on the live instance, no dashboard access to fix). Env var unset in dev → `undefined` → direct dev FAPI, which is correct. Verify the prod proxy with `curl https://<domain>/api/__clerk/v1/environment?_clerk_js_version=5` → Clerk JSON.
