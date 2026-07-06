---
name: orval hook call conventions
description: How the generated orval React Query hooks expect path params and mutation args in this repo
---

# Orval hook call conventions

The generated client (produced by the api-spec codegen script) **flattens** path params — it does NOT nest them under a `{ path: {...} }` object.

- Query hooks take path params as positional args, and the matching query-key builder takes the same positional args.
- Mutation hooks take a flat object that mixes path params and `data`:
  - `mutate({ id, data })` — single path param
  - `mutate({ parentId, id, data })` — multiple path params
  - `mutate({ id })` — path-only (delete/seal/etc.)

**Why:** Several pages were written with a nested `{ path: { id } }` convention. That compiles at runtime under Vite (esbuild strips types without checking them), so the bug stays invisible in dev and only surfaces when you run the web `typecheck` script — and it would have sent malformed requests.

**How to apply:** Treat the web typecheck as the gate after any codegen change; Vite dev never type-checks. When wiring a new endpoint hook, match the flat signature above rather than assuming a `{ path }` wrapper.
