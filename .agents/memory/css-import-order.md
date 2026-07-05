---
name: CSS @import order
description: Google Fonts @import must be the very first statement in index.css
---

# CSS @import Order Rule

**Rule:** `@import url('https://fonts.googleapis.com/...')` must be the absolute first line in `artifacts/web/src/index.css`, before `@import "tailwindcss"` and all other statements.

**Why:** PostCSS/CSS spec requires all @import statements to precede any other declarations (except @charset and empty @layer). Placing Google Fonts import after `@import "tailwindcss"` causes the warning `@import must precede all other statements` and fonts may not load.

**How to apply:** When adding any new @import url() for fonts or external sheets, put it at the very top of index.css.
