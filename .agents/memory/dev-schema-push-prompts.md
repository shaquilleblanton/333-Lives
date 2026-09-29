---
name: Development schema push prompts
description: Drizzle's non-interactive schema push can stop at ambiguous rename prompts in this workspace
---

Treat a Drizzle push that stops on an interactive rename prompt as an unresolved schema diff, not permission to force it.

**Why:** The development database has enough schema history for Drizzle to ask for table-rename resolution, but managed shell commands have no TTY. A forced push could misclassify or destructively change unrelated tables.

**How to apply:** Inspect the intended changes and current development schema first. If the change is strictly additive, apply only the exact additions to the development database and verify their presence. Never redirect a push to production; for managed PostgreSQL, Publish handles the production schema diff.