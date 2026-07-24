---
name: First-login provisioning race
description: JIT user provisioning must survive parallel first requests; ON CONFLICT only arbitrates its target constraint
---

**Rule:** Any just-in-time row provisioning keyed by an external identity (Clerk id) must tolerate concurrent first requests. `ON CONFLICT (email)` does NOT catch a collision on a *different* unique constraint (`users_clerk_id_unique`) — Postgres raises instead. Catch SQLSTATE 23505 (walk `.cause` chain for drizzle-wrapped errors) and re-read the winner row by the identity key.

**Why:** A new user's first app launch fires several API calls in parallel; all miss the fast path and INSERT. The loser 500'd — a once-per-user, first-impression failure that looked unreproducible later (in-process cache hid it). Found via prod-style logs during the TestFlight hardening sweep (July 2026).

**How to apply:** Any middleware/service that lazily creates rows on first access. Log when the fallback path fires (include constraint name) so races stay observable.
