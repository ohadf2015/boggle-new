---
phase: 55-tech-debt-docs-cleanup
plan: "01"
subsystem: blast
tags: [tech-debt, dead-code, lint, constants]
dependency_graph:
  requires: []
  provides: [clean-blast-types, lint-clean-imports]
  affects: [blast/types.ts, blastMultiplayerConstants.ts, blastComboEffectsTactical.ts]
tech_stack:
  added: []
  patterns: [merged-type-imports]
key_files:
  modified:
    - fe-next/components/blast/types.ts
    - fe-next/components/blast/__tests__/useBlastGame.test.ts
    - fe-next/components/blast/__tests__/useBlastGame.gem.test.ts
    - fe-next/shared/constants/blastMultiplayerConstants.ts
    - fe-next/components/blast/utils/blastComboEffectsTactical.ts
decisions:
  - "GEM_USE_BONUS/GEM_COLLECT_BONUS moved to test-local consts in gem test (values 3 and 8); not exported from types.ts"
  - "RAINBOW_BONUS assertion inlined as literal 10 with comment explaining 5+5 breakdown"
  - "blastComboEffectsTactical.ts: merged type + value imports into single inline import statement"
metrics:
  duration: "~5 min"
  completed: "2026-03-04"
  tasks_completed: 2
  files_modified: 5
---

# Phase 55 Plan 01: Blast Dead Constants + Lint Cleanup Summary

Remove 3 dead legacy constants from blast/types.ts and merge duplicate-import lint suppressions in 2 files, making blast module lint-clean with all 184 tests green.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remove RAINBOW_BONUS, GEM_USE_BONUS, GEM_COLLECT_BONUS from types.ts | deadc704 | types.ts, useBlastGame.test.ts, useBlastGame.gem.test.ts |
| 2 | Fix no-duplicate-imports in blastMultiplayerConstants.ts and blastComboEffectsTactical.ts | e5014f18 | blastMultiplayerConstants.ts, blastComboEffectsTactical.ts |

## Verification

- SC-1: blastComboEffects.ts = 476 lines (under 500 limit)
- SC-2: RAINBOW_BONUS, GEM_USE_BONUS, GEM_COLLECT_BONUS removed from types.ts; MAGNET_RADIUS (L153) and MAGNET_ATTRACT_BONUS (L155) preserved
- SC-3: eslint passes clean on both target files (no output)
- All 184 useBlastGame tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- fe-next/components/blast/types.ts: exists, MAGNET_RADIUS present, dead constants removed
- fe-next/shared/constants/blastMultiplayerConstants.ts: merged import, no eslint-disable comment
- fe-next/components/blast/utils/blastComboEffectsTactical.ts: merged import, no eslint-disable comment
- Commits deadc704 and e5014f18: confirmed in git log
