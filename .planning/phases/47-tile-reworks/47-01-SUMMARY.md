---
phase: 47-tile-reworks
plan: 01
subsystem: ui
tags: [blast, game-mechanics, special-tiles, rainbow, tdd, jest]

# Dependency graph
requires:
  - phase: 46-foundation-unified-tile-types-bug-fixes
    provides: clearTilesForWord switch statement with bomb/lightning/prism/gold/chain-propagation fixes

provides:
  - Rainbow Boost mechanic: amplifies best offensive special (2x) or doubles word score solo
  - RAINBOW_BOOST_MULTIPLIER constant in types.ts
  - 26 TDD tests verifying all three Rainbow Boost behaviors

affects:
  - 47-02, 47-03, 47-04, 47-05 (tile rework plans using same clearTilesForWord infrastructure)
  - Blast mode gameplay balance

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rainbow Boost pre-scan: scan path before main switch to find bestOffensiveSpecial"
    - "Offensive special ranking: prism > lightning > bomb > gem > magnet (score multipliers excluded)"
    - "rainbowSoloMultiplier applied to effectiveBase before goldMultiplier (multiplicative stacking)"
    - "Second firing pattern: re-execute special's case logic from case 'rainbow' using shared BFS queues"

key-files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.rainbowBoost.test.ts
  modified:
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/types.ts

key-decisions:
  - "Rainbow Boost uses pre-scan to find bestOffensiveSpecial before path processing loop begins"
  - "Gold/silver/diamond excluded from Rainbow amplification (score multipliers, not explosions)"
  - "Ice/frozen excluded from Rainbow amplification (no explosion effect, only obstacle resistance)"
  - "rainbowSoloMultiplier applied to effectiveBase before goldMultiplier: base * 2 * 3 = 6x (not base * 3 * 2)"
  - "Second firing shares processedBombs/processedLightning sets to maintain chain-propagation correctness"

patterns-established:
  - "Pre-scan pattern: scan tile types in path before switch to enable context-sensitive case handling"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 47 Plan 01: Rainbow Boost Mechanic Summary

**Rainbow tile redesigned from flat +5 bonus to universal amplifier: copies+doubles best offensive special in word, or 2x word score when solo**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-04T00:00:00Z
- **Completed:** 2026-03-04T00:12:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Added `RAINBOW_BOOST_MULTIPLIER = 2` constant to `types.ts`
- Wrote 26 TDD tests (RED phase) covering all 3 behaviors before implementation
- Replaced flat `RAINBOW_BONUS` (+5) with Rainbow Boost amplifier in `clearTilesForWord`
- Rainbow + bomb: bomb BFS fires twice (second explosion queued from case 'rainbow')
- Rainbow + lightning: column-clear fires twice
- Rainbow + prism: cross-clear fires twice
- Rainbow + gem: collect bonus doubled
- Rainbow + magnet: attraction area fired twice
- Rainbow solo / Rainbow + gold-only: `rainbowSoloMultiplier=2` applied to `effectiveBase`
- Gold multiplier applies AFTER rainbow multiplier (multiplicative, not additive)
- All 657 blast tests pass (0 regressions)

## Task Commits

1. **Task 1: Write failing tests for Rainbow Boost behavior** - `67de45ef` (test)
2. **Task 2: Implement Rainbow Boost in clearTilesForWord** - `f909ad18` (feat)

## Files Created/Modified
- `fe-next/components/blast/__tests__/useBlastGame.rainbowBoost.test.ts` - 26 TDD tests (6 groups) covering all Rainbow Boost behaviors
- `fe-next/components/blast/hooks/useBlastGame.ts` - Replaced RAINBOW_BONUS with RAINBOW_BOOST_MULTIPLIER; pre-scan + case 'rainbow' rewrite; effectiveBase calculation
- `fe-next/components/blast/types.ts` - Added RAINBOW_BOOST_MULTIPLIER = 2; kept RAINBOW_BONUS for legacy reference

## Decisions Made
- Pre-scan path before the main `for (const cell of path)` loop to identify `bestOffensiveSpecial` — avoids needing two-pass logic inside case 'rainbow'
- Gold/silver/diamond excluded from offensive ranking — they are score multipliers (applied at end), not explosion effects
- Ice/frozen excluded — have no explosion, only obstacle resistance (flat ICE_CLEAR_BONUS/FROZEN_CLEAR_BONUS)
- Second firing in case 'rainbow' uses same `bombQueue`, `processedBombs`, `processedLightning` sets as first firing — maintains BUGF-01 through BUGF-03 correctness
- `rainbowSoloMultiplier` applied to `effectiveBase` which feeds `goldMultiplier` calculation — ensures gold stacks on top of rainbow (not separate from it)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — TDD cycle followed cleanly. RED phase: 1 failing test (base=6 gave 11 instead of 12). GREEN phase: all 26 pass with 0 regressions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rainbow Boost fully functional and tested
- Same `clearTilesForWord` infrastructure ready for 47-02 (Wildcard removal), 47-03 (Mirror tile), etc.
- No blockers

## Self-Check: PASSED
- `fe-next/components/blast/__tests__/useBlastGame.rainbowBoost.test.ts` — FOUND
- `fe-next/components/blast/hooks/useBlastGame.ts` — FOUND
- `fe-next/components/blast/types.ts` — FOUND
- Commit `67de45ef` — FOUND
- Commit `f909ad18` — FOUND

---
*Phase: 47-tile-reworks*
*Completed: 2026-03-04*
