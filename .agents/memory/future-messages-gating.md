---
name: Future messages content gating
description: How sealed/passcode-protected message content is kept server-side, and the drizzle-zod date pitfall in message create
---

# Future messages: server-side content gating + passcode

**Rule:** A sealed message's `content`/`audioUrl` must never be sent to the client until it is legitimately unlocked. The messages routes use a `present()` sanitizer that strips `passcodeHash` always and nulls `content`/`audioUrl` unless `dateReached && !hasPasscode`. Passcode-protected content is revealed ONLY by `POST /messages/:id/unlock`.

**Why:** The original bug was that `content` was returned by list/get regardless of lock state; the frontend only hid it visually, so the "seal" was cosmetic.

**How to apply:** Any new field that should stay sealed must be gated inside `present()` (or the unlock endpoint), never returned raw from list/get. Passcodes are hashed with Node `crypto.scryptSync` (per-message salt, `salt:hash`) + `timingSafeEqual`; never store or return plaintext. Unlock endpoint has an in-memory per-message-id attempt throttle (429 after N tries in a window) — resets on success.

## drizzle-zod date coercion pitfall
`insertMessageSchema = createInsertSchema(messagesTable)` types `timestamp` columns (e.g. `unlockDate`) as `z.date()`, NOT string. The client sends an ISO string, so the create route MUST coerce: `unlockDate: body.unlockDate ? new Date(body.unlockDate) : undefined` before `safeParse`, or you get `expected date, received string` 400s.

**How to apply:** For any route inserting a row with a timestamp column via a drizzle-zod insert schema, convert incoming ISO date strings to `Date` before parsing.
