---
status: research-only
attempted: fix gate failures in fe-next/hooks/useGameStartTelemetry.ts
files_touched: none
next_steps: >
  The listed file (useGameStartTelemetry.ts) is code-correct — ESLint clean (0
  errors, 0 warnings on targeted run), TypeScript is valid, hooks are ordered
  correctly. The gate failure is a build OOM (6 GB heap) during
  next build --webpack, traceable to v8::internal::JsonStringify in
  webpack module-cache serialization — environmental, not caused by this
  file's code changes. File should ship on any build run that doesn't OOM.
  Investigate webpack memory pressure separately (circular deps, large dep
  import, or increase NODE_OPTIONS=--max-old-space-size beyond 6144).
---

## Analysis

### File: fe-next/hooks/useGameStartTelemetry.ts
- ESLint: 0 errors, 0 warnings (confirmed by targeted run)
- TypeScript: valid — imports resolve, types correct
- React hooks: both useEffect calls unconditional (no hooks-after-early-return)
- Change: added emitAbandonOnSpaNavigate import + cleanup useEffect for SPA abandon tracking

### File: fe-next/utils/abandonOnPagehide.ts (dependency, also modified)
- Exports emitAbandonOnSpaNavigate() correctly
- ESLint clean, no circular deps (imports posthog only)

### Gate failure root cause
Build OOM (FATAL ERROR: Ineffective mark-compacts near heap limit) during
next build --webpack at ~6GB heap. Stack trace: v8::internal::JsonStringify
in webpack module serialization. Not caused by the 15-line diff in these
files. The 8 ESLint warnings in gate output are from other files in the batch
(targeted ESLint on these two files = clean).

### Action: none needed
No code errors in the listed file. Gate failure is environmental.
