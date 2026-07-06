---
name: React types must track the pinned react runtime
description: Why @types/react is pinned to 19.1.x via catalog + pnpm overrides, and when it breaks
---

Rule: `@types/react` / `@types/react-dom` must stay on the **19.1.x** line, matching the exact-pinned `react@19.1.0` / `react-dom@19.1.0` runtime in the pnpm catalog. Enforced two ways in `pnpm-workspace.yaml`: catalog entries (`~19.1.10` / `~19.1.7`) AND `overrides` forcing `@types/react=19.1.17`, `@types/react-dom=19.1.11` so transitive Radix peers dedupe.

**Why:** react is pinned exact because Expo requires it. When the catalog drifted to `^19.2.0`, the web app resolved `@types/react@19.2.17` while the Expo mobile app (and its react-dom pairing) pulled `19.1.17` — two type versions coexisted. Radix UI augments `CSSProperties` with the `--radix-${string}` index signature on only one of them, so shadcn components (button-group, calendar, any prop-spreading primitive) failed `tsc` with "Index signature for type `--radix-${string}` is missing". A single version makes the augmentation land uniformly.

**How to apply:** If web typecheck suddenly fails across multiple `components/ui/*` files with a `--radix-*` CSSProperties error after a merge/install, check for a second `@types/react` version (`find node_modules/.pnpm -maxdepth 1 -type d -name '@types+react@*'`) and re-pin to the 19.1 line — do NOT chase it by editing individual UI components. Two physical version dirs can linger in the store; what matters is that the override forces consumers to resolve to one.
