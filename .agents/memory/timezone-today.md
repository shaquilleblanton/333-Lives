---
name: App-wide "today" convention
description: How day-scoped data resolves the user's local calendar day across the API
---

# "Today" is the user's local calendar day, not UTC

Day-scoped data (intentions, habit check-ins, gratitude, journal, affirmations,
dashboard streak) keys off a `YYYY-MM-DD` string that must reflect the user's
**local** day. Resolve it with `getTodayDate(req)` from
`artifacts/api-server/src/lib/date.ts` — never `new Date().toISOString().split("T")[0]`.

**Why:** UTC is ahead of the Americas, so an evening entry flips to "tomorrow"
under UTC — intentions disappear from Home and the streak breaks. Fixed by
computing the day in the client's timezone.

**How to apply:**
- The web client (`lib/api-client-react/src/custom-fetch.ts`) attaches an
  `x-timezone` header (IANA name from `Intl.DateTimeFormat().resolvedOptions().timeZone`)
  to every request.
- `getTodayDate(req)` reads that header via `getTimezone(req)` and formats the
  date with `Intl.DateTimeFormat` in that zone; falls back to UTC when absent/invalid.
- Any new day-scoped route must call `getTodayDate(req)` and pass `req` through.
- The dashboard streak walk uses UTC calendar arithmetic on the already-local
  `today` string — that's fine (pure date stepping), only the seed matters.

## Filtering timestamp columns by "today"

For columns storing an actual instant (e.g. `eventsTable.startTime`), do NOT
build the window as `today + "T00:00:00Z"` / `...T23:59:59Z` — those are UTC
boundaries and reintroduce the evening-Americas bug. Use `getLocalDayRange(req)`
from `date.ts`, which converts the local day's wall-clock midnight→midnight to
the correct UTC instants (two-pass offset lookup, DST-safe).

**Rule of thumb:** date-string columns (`.date` = `YYYY-MM-DD`) → compare with
`getTodayDate(req)`; timestamp columns → filter with `getLocalDayRange(req)`.
