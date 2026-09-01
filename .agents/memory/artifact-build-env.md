---
name: Artifact build environment
description: Environment variables required when validating artifact builds outside their managed workflow
---

Direct production builds for path-routed web artifacts require both `PORT` and `BASE_PATH`; managed artifact workflows provide these values automatically.

**Why:** Running the web build with only a port, or with neither variable, fails while loading the Vite config even though the application itself is healthy.

**How to apply:** When running a web artifact build directly, provide the artifact's configured port and base path. Prefer the managed workflow for runtime verification.