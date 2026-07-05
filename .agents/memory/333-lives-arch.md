---
name: 333 Lives Architecture
description: Stack decisions and key facts for the 333 Lives app
---

# 333 Lives Architecture

**API server**: `artifacts/api-server`, port 8080, Fastify + Drizzle + PostgreSQL. 9 modules: users, messages, vault, events, habits+checkins, intentions, journal, goals, affirmations + dashboard rollup.

**Web app**: `artifacts/web`, port 22333, React+Vite+Wouter. Uses `@workspace/api-client-react` orval-generated hooks.

**Default user**: ID=1, "James Carter", pre-seeded with all module data.

**Orval fix**: `indexFiles: false` in zod output config in `lib/api-spec/orval.config.ts` — prevents TS2308 barrel conflict from `CreateXBody`/`UpdateXBody` schema names. Do NOT revert.

**Why:** Body schemas named CreateXBody/UpdateXBody cause TS2308 barrel collisions. indexFiles:false is the correct fix without renaming schemas.

**Color palette**: Charcoal #0F0F11 bg, Copper #BB734A accent, Ivory #F7F4EF text, Sage #8FA67A secondary, Clay #C8B57C tertiary.
**Fonts**: Playfair Display (headings), DM Sans (sub), Inter (body) — loaded via Google Fonts @import at top of index.css.
