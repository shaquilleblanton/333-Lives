---
name: Web typecheck reads api-client-react built .d.ts
description: Phantom "no exported member" errors from stale library declarations
---

# Stale library .d.ts causes phantom web typecheck errors

`artifacts/web/tsconfig.json` uses TS **project references** to
`lib/api-client-react`, so `pnpm --filter @workspace/web run typecheck` reads the
library's emitted `dist/**/*.d.ts`, NOT its `src`. If the library source changed
(e.g. orval regenerated hooks) but `dist` wasn't rebuilt, the web typecheck fails
with errors like `'@workspace/api-client-react' has no exported member 'useX'`
even though the export exists in source.

**Why:** the referenced project is `composite` + `emitDeclarationOnly`; its
declarations are a build artifact that can drift from source.

**How to apply:** after changing any `lib/*` package, run `pnpm run typecheck:libs`
(which is `tsc --build`) to regenerate the declarations before typechecking web.
