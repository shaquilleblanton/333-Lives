---
name: Expo useColors dark-key cast
description: Why adding a `dark` palette key to the Expo scaffold's constants/colors.ts breaks typecheck, and the fix.
---

The Expo scaffold's `hooks/useColors.ts` selects a palette with a cast:
`(colors as Record<string, typeof colors.light>).dark`. This cast fails
typecheck the moment `constants/colors.ts` gains a real `dark` key, because
`colors` also has a sibling `radius: number` that does not match the
`Record<string, palette>` index signature ("Property 'radius' is incompatible").

**Fix:** once a `dark` key exists, reference it directly —
`const palette = scheme === "dark" ? colors.dark : colors.light;` — and drop the
`Record` cast. The cast only existed to tolerate a light-only default.

**How to apply:** whenever you sync a web artifact's dark tokens into the Expo
`colors.ts` (adding a `dark` key), also simplify `useColors.ts` to the direct
ternary, or `pnpm typecheck` in the mobile artifact will fail.
