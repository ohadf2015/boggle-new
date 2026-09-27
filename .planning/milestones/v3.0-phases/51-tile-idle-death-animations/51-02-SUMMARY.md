---
phase: 51-tile-idle-death-animations
plan: 02
subsystem: ui
tags: [phaser, blast-mode, tiles, animations, tdd]

# Dependency graph
requires:
  - phase: 51-01
    provides: mirror/silver/diamond idle tweens; all 13 special types in BlastTileRules
provides:
  - playClearByType() dispatch switch in BlastTile.ts
  - 10 per-type private death methods + playGenericDeath fallback
  - per-type death animation test suite (32 new tests)
affects: [phaser, blast-mode, tile-visuals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - playClearByType() dispatch — switch on blastType, delegates to typed private methods
    - rainbow dissolve uses single alpha tween (no rotation) to distinguish from generic
    - lightning zap uses rapid 3-step alpha sequence (40ms each) then settle
    - explosive/refract types use symmetric scale expansion to visually differentiate

key-files:
  created: []
  modified:
    - fe-next/phaser/objects/BlastTile.ts
    - fe-next/phaser/objects/__tests__/BlastTile.clearAnimation.test.ts

key-decisions:
  - "playClearAnimation() delegates to playClearByType() after reduceMotion guard — single responsibility"
  - "rainbow: pure alpha dissolve with no rotation to make it visually distinct from generic tumble"
  - "lightning: 3-flash rapid sequence (40ms each) then settle — distinct from any other type"
  - "gold/silver/diamond share playGoldBurstDeath — visual uniformity for precious metal tier"
  - "standard rotation test updated to use 'standard' tile (gold now uses scale-burst, not rotation)"

patterns-established:
  - "Scale-only burst for precious metals (gold/silver/diamond): no rotation, symmetric expansion"
  - "Pure alpha dissolve for dissolve-type deaths (rainbow): maximally distinct from rotation-based deaths"

requirements-completed: [TILE-11]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 51 Plan 02: Tile Death Animations (per-type) Summary

**Added playClearByType() dispatch to BlastTile with 10 distinct per-type death animations; 94 tests green across 3 suites**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T17:12:24Z
- **Completed:** 2026-03-04T17:15:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- All 13 special tile types now have visually distinct death animations via `playClearByType()`
- `playClearAnimation()` delegates to type-specific methods after the `reduceMotion` guard (unchanged)
- `reduceMotion` still produces a single alpha fade for ALL types — no per-type branching
- `isLowEnd` still halves particle count for all types via existing `clearParticleCount()` helper
- All death Promises resolve correctly (tested for all 13 types)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write per-type death animation tests (RED phase)** - `5d226516` (test)
2. **Task 2: Implement playClearByType() and per-type death methods** - `a0193f94` (feat)

_Note: TDD — RED phase tests written first (6 failing), then GREEN implementation, no separate REFACTOR needed._

## Files Created/Modified
- `fe-next/phaser/objects/BlastTile.ts` - Added `playClearByType()` dispatch + 10 private death methods + `playGenericDeath()` fallback; refactored `playClearAnimation()` to delegate after `reduceMotion` guard
- `fe-next/phaser/objects/__tests__/BlastTile.clearAnimation.test.ts` - 32 new tests in "BlastTile per-type death animations" describe block; fixed 1 pre-existing rotation test to use `standard` tile type

## Decisions Made
- `playClearAnimation()` retains same signature — only internal delegate changed
- rainbow uses pure alpha dissolve (no rotation) — maximally distinct from generic tumble
- lightning uses 3-flash rapid sequence (40ms pulses) — matches the "zap flash" feel
- gold/silver/diamond share `playGoldBurstDeath()` — consistent precious-metal tier visual
- magnet uses full 360 degree spin — uniquely wraps while fading
- mirror uses `scaleX` flip (`1 → -1`) before fade — metaphor of shattering mirror image

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing "rotation" test used gold tile; gold now has scale-burst (no rotation)**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Existing test `BlastTile.playClearAnimation rotation / includes a rotation property in the clear tween` used `makeTile('A', 'gold', 0)`. After implementing `playGoldBurstDeath()` (scale expansion, no rotation), this test failed.
- **Fix:** Updated test to use `'standard'` tile which correctly goes through `playGenericDeath()` (has rotation). Renamed test to `'standard tile includes a rotation property...'` for clarity.
- **Files modified:** `BlastTile.clearAnimation.test.ts`
- **Commit:** `a0193f94`

## Issues Encountered
- Pre-existing test used `gold` tile to test generic rotation behavior; after giving gold a distinct death animation, the assumption broke. Fixed by switching to `standard` type for that test (matches intent: "generic path has rotation").

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 13 special tile types now have both idle AND death animations complete
- Phase 51 (TILE-10 + TILE-11) fully satisfied
- No blockers

## Self-Check: PASSED
