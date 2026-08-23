# 333 Lives

A life management, wellness, and legacy app — send messages to the future, track habits, secure your documents, and live with intention.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle schema (users, messages, vault, events, habits, intentions)
- `artifacts/api-server/src/routes/` — Express route handlers
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas (do not edit)

## API Modules

- `GET/PUT /api/users/me` — User profile
- `GET/POST/DELETE /api/messages` + `/:id` — Time-locked future messages
- `GET/POST/DELETE /api/vault` + `/:id` — Secure document vault (categories: document, photo, journal, voice_note, important_info)
- `GET/POST /api/events` + `PUT/DELETE /:id` — Calendar events & medication reminders
- `GET/POST /api/habits` + `PUT/DELETE /:id` + `POST /:id/checkin` — Daily habits with streak tracking
- `GET/POST /api/intentions` + `PUT /:id` — Daily 3 intentions (the 333 method)
- `GET /api/dashboard` — Full dashboard summary (user stats, today's habits/events/intentions, upcoming messages, vault count)

## Architecture decisions

- Single default user (id=1) with auto-creation for MVP — no auth required for first build
- `isUnlocked` on messages is computed at query time (compares `unlockDate` to `now`), never stored
- Habit streaks computed from check-in count; `checkedInToday` computed per-request by checking today's date
- `indexFiles: false` in orval zod config — prevents duplicate barrel export conflict between `generated/api` and `generated/types`
- Dashboard endpoint aggregates all modules in one call for mobile efficiency

## Product

- **Future Messages**: Write text/audio messages that unlock on a chosen future date
- **Vault**: Encrypted storage for documents, photos, journals, voice notes
- **Calendar**: Events, medication reminders, recurring routines
- **Habits**: Daily tracking with streaks, check-ins, and completion rates
- **Daily Intentions**: The 333 method — 3 intentions every day
- **Dashboard**: Personalized daily view with stats, upcoming messages, today's schedule

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`
- `indexFiles: false` must stay in orval zod config — removing it causes duplicate export errors
- DB push (`pnpm --filter @workspace/db run push`) needed after schema changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
