---
name: orval hook call conventions
description: How the generated orval React Query hooks expect path params and mutation args in this repo
---

# Orval hook call conventions

The generated client (`lib/api-client-react/src/generated/api.ts`, produced by `pnpm --filter @workspace/api-spec run codegen`) **flattens** path params — it does NOT nest them under a `{ path: {...} }` object.

- Query hooks take path params as positional args: `useGetRelationshipMoments(personId)`, and the matching key builder is `getGetRelationshipMomentsQueryKey(personId)`.
- Mutation hooks take a flat object mixing path params + `data`:
  - `mutate({ id, data })` — single path param
  - `mutate({ personId, id, data })` — multiple path params
  - `mutate({ id })` — path-only (delete/seal/etc.)

**Why:** Multiple pages (people, legacy-letters, community, growth) were written with a nested `{ path: { id } }` / `{ habitId, data }` convention that compiled at runtime under Vite (esbuild strips types) but broke `tsc` typecheck and would have sent malformed requests. Vite dev never type-checks, so these bugs stay invisible until you run `pnpm --filter @workspace/web run typecheck`.

**How to apply:** After any codegen change, run the web typecheck before considering frontend work done. When wiring a new endpoint hook, match the flat signature above rather than guessing a `{ path }` wrapper.
