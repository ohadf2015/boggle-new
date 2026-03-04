---
phase: 49-combination-ux-discovery-codex-scaling-translations
plan: 03
subsystem: blast-combo-effects
tags: [blast, combo, word-length-scaling, codex, pure-logic]
dependency_graph:
  requires: []
  provides: [blastComboScaling, wordLengthScale-in-ComboEffectContext, CODEX_COMBOS]
  affects: [blastComboEffects, blastComboEffectsTactical, useBlastGame, plan-02-codex]
tech_stack:
  added: []
  patterns: [word-length-scaling, scaledRadius-ceil, readonly-const-array]
key_files:
  created:
    - fe-next/components/blast/utils/blastComboScaling.ts
    - fe-next/components/blast/utils/__tests__/blastComboScaling.test.ts
  modified:
    - fe-next/components/blast/utils/blastComboEffects.ts
    - fe-next/components/blast/utils/blastComboEffectsTactical.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/utils/__tests__/blastComboEffects.test.ts
decisions:
  - "scaledRadius uses Math.ceil so radii always expand at non-integer scale factors"
  - "CODEX_COMBOS excludes catch-alls (gold_special, rainbow_special, triple_special) — only 31 specific pairs are codex-trackable"
  - "fireVortex derives explode radius from ctx.wordLengthScale (not passed separately)"
  - "makeCtx test helper defaults wordLengthScale to 1.0 to keep existing tests unaffected"
metrics:
  duration: "~10 min"
  completed: "2026-03-04T14:45:26Z"
  tasks_completed: 2
  files_modified: 6
---

# Phase 49 Plan 03: Word-Length Scaling + CODEX_COMBOS Summary

Word-length scaling for combo area-of-effect radii implemented as a pure utility layer. 7+ letter words now produce physically larger bomb/vortex effects. CODEX_COMBOS constant exported for Plan 02 codex tracking.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create blastComboScaling utility | b0e1c635 | blastComboScaling.ts + test |
| 2 | Extend ComboEffectContext + apply scaledRadius | f8916ec5 | blastComboEffects.ts, blastComboEffectsTactical.ts, useBlastGame.ts, test |

## What Was Built

### blastComboScaling.ts (new)
- `getWordLengthScaleFactor(wordLength)`: returns 1.0 (3-4 letters), 1.5 (5-6 letters), 2.0 (7+ letters)
- `scaledRadius(base, scale)`: `Math.ceil(base * scale)` — always expands
- `CODEX_COMBOS`: readonly array of 31 codex-eligible combo types (excludes `gold_special`, `rainbow_special`, `triple_special`)
- `CODEX_COMBO_COUNT`: convenience constant = 31

### ComboEffectContext (extended)
Added `wordLengthScale: number` field with JSDoc clarifying it applies to area radii ONLY, not score multipliers.

### Radius scaling applied to:
- **bomb_lightning**: BOMB_RADIUS columns scaled
- **bomb_rainbow**: fireAreaBlast radius scaled
- **bomb_mirror**: fireAreaBlast radius at both positions scaled
- **bomb_magnet**: VORTEX_PULL_RADIUS + base-2 blast radius both scaled
- **bomb_gem**: BOMB_RADIUS scaled
- **bomb_frozen**: BOMB_RADIUS scaled
- **lightning_magnet**: VORTEX_PULL_RADIUS + column detection range scaled
- **fireVortex**: VORTEX_EXPLODE_RADIUS derived from ctx.wordLengthScale
- **mirror_magnet**: VORTEX_PULL_RADIUS at both positions scaled
- **magnet_gem**: VORTEX_PULL_RADIUS scaled
- **magnet_frozen**: VORTEX_PULL_RADIUS scaled

### NOT scaled (correct):
- Cross-clears (prism/lightning) — already board-wide
- Score multipliers — explicitly excluded per COMB-06 requirement
- bomb_bomb 5x5 fixed blast — this is a fixed 2-radius, not BOMB_RADIUS

### Call site wiring
`useBlastGame.ts` at `executeComboEffect` call site now passes `wordLengthScale: getWordLengthScaleFactor(path.length)`.

## Test Results

- `blastComboScaling.test.ts`: 15 tests green (new)
- `blastComboEffects.test.ts`: 34 tests green (updated makeCtx helper)
- All blast tests: 861 tests, 63 suites — all green

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- blastComboScaling.ts: FOUND
- blastComboScaling.test.ts: FOUND
- Commit b0e1c635: FOUND
- Commit f8916ec5: FOUND
