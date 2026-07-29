---
phase: 46-foundation-unified-tile-types-bug-fixes
plan: 03
subsystem: blast-game
tags: [blast, scoring, cascade, tile-types, bug-fixes, useBlastGame]

# Dependency graph
requires:
  - phase: 46-01
    provides: unified BlastTileState with hitsRemaining field
  - phase: 46-02
    provides: processedBombs + processedLightning Sets in clearTilesForWord

provides:
  - BUGF-03: combo bombs added to processedBombs before main path loop (no double-BFS)
  - BUGF-04: cascade detection uses empty foundSet (re-formed words always score)
  - BUGF-05: frozen/ice tiles crack in cascades when hitsRemaining > 1
  - BUGF-06: gold tiles multiply (3^n) not add (n*(3-1)) — 2 gold = 9x not 5x
  - BUGF-07: cascade highlight timer uses tileStatesRef.current (fresh state, not stale closure)

affects: [blast-scoring, cascade-chain, wave-design, 47-blast-special-tiles]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "goldMultiplier accumulation: initialize=1 before path loop, multiply in gold case, apply baseScore*goldMultiplier after loop"
    - "tileStatesRef pattern: keep ref in sync (ref.current = tileStates) for async callbacks"
    - "cascade foundSet = new Set<string>() — empty, not seeded from gameState.wordsFound"

key-files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.stateScoring.test.ts
  modified:
    - fe-next/components/blast/hooks/useBlastGame.ts

key-decisions:
  - "Gold stacking is multiplicative (3^n): 1 gold=3x, 2 gold=9x, 3 gold=27x — matches Candy Crush conventions"
  - "Cascade foundSet empty: re-formed words after gravity are always new scoring opportunities, not duplicates"
  - "Combo bombs added to processedBombs immediately after combo switch block (not per-tile in main loop)"

patterns-established:
  - "goldMultiplier: track as running product initialized to 1, apply as baseScore*goldMultiplier at end"
  - "tileStatesRef: ref updated every render (ref.current = tileStates after useState), used in async callbacks"

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 46 Plan 03: State & Scoring Bug Fixes Summary

**Five blast mode scoring and state bugs fixed: gold is now multiplicative (3^n), cascade re-formations always score, frozen tiles crack in cascades, combo bombs dedup correctly, cascade timers use fresh state via ref**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T11:16:25Z
- **Completed:** 2026-03-04T11:20:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Fixed gold tile scoring: additive was 5x for 2 gold, multiplicative gives correct 9x
- Fixed cascade word deduplication: re-formed words (e.g. "CATS" after gravity) now always score
- Fixed frozen tile cascade handling: hitsRemaining > 1 cracks tile, = 1 clears it
- Fixed bomb double-BFS: combo bombs now in processedBombs before main path loop
- Fixed cascade stale state: timer callback uses `tileStatesRef.current` not closure snapshot
- All 631 blast tests pass with no regressions

## Task Commits

1. **Task 1: Write failing tests (RED)** - `a4258863` (test)
2. **Task 2: Fix all 5 bugs (GREEN)** - `c64c0237` (fix)

## Files Created/Modified
- `fe-next/components/blast/__tests__/useBlastGame.stateScoring.test.ts` - 23 regression tests for BUGF-03 through BUGF-07
- `fe-next/components/blast/hooks/useBlastGame.ts` - 5 bug fixes: goldMultiplier accumulation, cascade foundSet, frozen crack logic, processedBombs dedup, tileStatesRef

## Decisions Made
- Gold stacking multiplicative (3^n): Candy Crush industry convention; additive was a design mistake producing 5x instead of 9x for 2 gold tiles
- Cascade foundSet = empty: cascade words are new board formations after gravity, semantically different from player-submitted duplicates — should always score
- tileStatesRef: standard React ref pattern for async timer callbacks to avoid stale closure captures

## Deviations from Plan

None - plan executed exactly as written. All 5 bugs fixed with the approach specified in the plan.

## Issues Encountered

None. Each fix was straightforward once the bug was understood.

## Next Phase Readiness
- Blast mode scoring foundation is now correct: gold multiplies, cascades re-score, frozen cracks, bombs don't double-process, timers use fresh state
- Ready for Phase 47 special tile expansion (mirror, gem redesign, etc.)

---
*Phase: 46-foundation-unified-tile-types-bug-fixes*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: fe-next/components/blast/__tests__/useBlastGame.stateScoring.test.ts
- FOUND: fe-next/components/blast/hooks/useBlastGame.ts
- FOUND: .planning/phases/46-foundation-unified-tile-types-bug-fixes/46-03-SUMMARY.md
- FOUND commit: a4258863 (test RED)
- FOUND commit: c64c0237 (fix GREEN)
