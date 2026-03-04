---
phase: 50-psychological-hooks
plan: 02
subsystem: ui
tags: [react, blast, near-miss, shimmer, psychology, game-feel, tdd]

# Dependency graph
requires:
  - phase: 48-combo-system-core
    provides: detectSpecialCombos and BlastTileState types used by near-miss detector
  - phase: 49-combo-discovery
    provides: BlastGame wiring patterns (hook injection, prop threading)
provides:
  - Pure near-miss detector (detectNearMiss) scanning adjacent specials not in submitted path
  - useBlastNearMiss hook with 1500ms auto-clear shimmer state
  - nearMissPulse CSS keyframe animation with reduced-motion variant
  - shimmerCells prop threaded through BlastGame → BlastGameLayout → BlastGrid
affects: [50-psychological-hooks, game-feel, blast-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED-GREEN cycle for pure utility + React hook
    - hadCombo gate: detectSpecialCombos called pre-clear to skip near-miss on player success
    - shimmerCells threaded as optional prop (backward-compatible defaults to [])
    - CSS animation via inline style referencing @keyframes (no Tailwind needed)

key-files:
  created:
    - fe-next/components/blast/utils/blastNearMiss.ts
    - fe-next/components/blast/utils/__tests__/blastNearMiss.test.ts
    - fe-next/components/blast/hooks/useBlastNearMiss.ts
    - fe-next/components/blast/hooks/__tests__/useBlastNearMiss.test.ts
  modified:
    - fe-next/components/blast/BlastGame.tsx
    - fe-next/components/blast/BlastGameLayout.tsx
    - fe-next/components/blast/BlastGrid.tsx
    - fe-next/app/animations.css

key-decisions:
  - "COMBO_ELIGIBLE_TYPES excludes standard, gold, silver, diamond, ice — only explosion specials eligible"
  - "hadCombo derived pre-clear via detectSpecialCombos to avoid stale tileStates post-clear"
  - "Requires 2+ adjacent specials (not just 1) to avoid over-triggering on trivial boards"
  - "shimmerCells capped at 3 to avoid visual clutter (MAX_NEAR_MISS_CELLS = 3)"
  - "CSS animation via inline style referencing @keyframes nearMissPulse — no Tailwind class needed"

patterns-established:
  - "Near-miss pattern: pure detector + thin hook with auto-clear timer + CSS keyframe overlay"

requirements-completed: [PSYC-02]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 50 Plan 02: Near-Miss Shimmer Summary

**Pure detectNearMiss + useBlastNearMiss hook pulsing 2-3 adjacent special tiles for 1500ms after word submission when player missed a combo opportunity**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T16:11:44Z
- **Completed:** 2026-03-04T16:17:40Z
- **Tasks:** 4 (TDD RED, GREEN, REFACTOR via lint fix, wiring)
- **Files modified:** 8

## Accomplishments
- 22 tests covering all near-miss detection cases (null paths, adjacency, cap-at-3, hadCombo gate)
- `detectNearMiss`: scans 1-cell radius for uncleared eligible specials not in submitted path; returns null if <2 found or hadCombo=true
- `useBlastNearMiss`: wraps detector, sets shimmerCells, auto-clears after 1500ms, cleans timer on unmount
- Shimmer threaded: BlastGame (hook + hadCombo detection) → BlastGameLayout (optional prop) → BlastGrid (positioned div overlays)
- CSS keyframe `nearMissPulse`: scale + opacity 1.5s animation; reduced-motion variant uses opacity-only

## Task Commits

1. **TDD RED: Failing tests for blastNearMiss + useBlastNearMiss** - `9970bebc` (test)
2. **TDD GREEN: Implement detectNearMiss + useBlastNearMiss** - `b912de47` (feat)
3. **Wire near-miss shimmer into BlastGame/BlastGameLayout/BlastGrid** - `c3f2cf46` (feat)

## Files Created/Modified
- `fe-next/components/blast/utils/blastNearMiss.ts` - Pure detectNearMiss function
- `fe-next/components/blast/utils/__tests__/blastNearMiss.test.ts` - 13 tests
- `fe-next/components/blast/hooks/useBlastNearMiss.ts` - React hook with 1500ms auto-clear
- `fe-next/components/blast/hooks/__tests__/useBlastNearMiss.test.ts` - 9 tests
- `fe-next/components/blast/BlastGame.tsx` - Added useBlastNearMiss, nearMiss.check call in handleWordAccepted
- `fe-next/components/blast/BlastGameLayout.tsx` - Added shimmerCells optional prop
- `fe-next/components/blast/BlastGrid.tsx` - Renders positioned shimmer overlays on shimmerCells
- `fe-next/app/animations.css` - Added @keyframes nearMissPulse + reduced-motion variant

## Decisions Made
- `COMBO_ELIGIBLE_TYPES` excludes standard, gold, silver, diamond, ice — only explosion/effect specials create near-miss moments
- `hadCombo` derived via `detectSpecialCombos(path, blast.tileStates)` pre-clear to avoid stale state after clear
- Requires 2+ adjacent specials to avoid over-triggering; caps output at 3 cells for clean visuals
- Duplicate import lint error fixed by merging type-only and value imports from blastCombos

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate import of blastCombos**
- **Found during:** Wiring task (lint step)
- **Issue:** Added `detectSpecialCombos` import when file already imported `type { BlastComboType, SpecialCombo }` from same module
- **Fix:** Merged into single import: `import { detectSpecialCombos, type BlastComboType, type SpecialCombo }`
- **Files modified:** fe-next/components/blast/BlastGame.tsx
- **Verification:** ESLint passes with 0 errors
- **Committed in:** c3f2cf46

---

**Total deviations:** 1 auto-fixed (Rule 1 - duplicate import lint error)
**Impact on plan:** Trivial lint fix, no behavior change.

## Issues Encountered
None — plan executed smoothly.

## Next Phase Readiness
- Near-miss shimmer system complete and wired
- Ready for 50-03 (next psychological hook plan)
- shimmerCells prop is backward-compatible (optional, defaults to [])

---
*Phase: 50-psychological-hooks*
*Completed: 2026-03-04*
