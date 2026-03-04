---
phase: 51-tile-idle-death-animations
plan: 01
subsystem: ui
tags: [phaser, blast-mode, tiles, animations, tdd]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    provides: mirror/silver/diamond tile types added to BlastTileType union
provides:
  - mirror/silver/diamond Phaser visual configs in BlastTileRules lookup tables
  - mirror-shimmer, gleam, diamond-sparkle idle tweens in BlastTile.startTypeSpecificTween()
  - wildcard removed from BLAST_TILE_CONFIGS (never spawned since Phase 47)
affects: [phaser, blast-mode, tile-visuals, 51-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - _idleType tag on Phaser tween configs for test-findability
    - mirror idle uses alpha oscillation (not scaleX flip) for RTL compatibility

key-files:
  created: []
  modified:
    - fe-next/lib/phaser/logic/BlastTileRules.ts
    - fe-next/lib/phaser/logic/__tests__/BlastTileRules.test.ts
    - fe-next/phaser/objects/BlastTile.ts
    - fe-next/phaser/objects/__tests__/BlastTile.idle.test.ts

key-decisions:
  - "BLAST_TILE_CONFIGS type updated to Exclude<BlastTileType, 'standard' | 'wildcard'> — wildcard is never spawned so no config needed"
  - "mirror idle uses alpha oscillation on overlay, not scaleX flip, to avoid RTL rendering issues"
  - "BlastTile.ts guards badge text lookup with blastType !== 'wildcard' since wildcard has no BLAST_TILE_CONFIGS entry"

patterns-established:
  - "Alpha-shimmer pattern for reflective tiles (mirror, silver): targets overlay alpha, yoyo, Sine.easeInOut"
  - "Scale-pulse pattern for sparkle tiles (diamond): targets tile scaleX/scaleY, slightly above breathing range (1.06 vs 1.03)"

requirements-completed: [TILE-10]

# Metrics
duration: 14min
completed: 2026-03-04
---

# Phase 51 Plan 01: Tile Idle Animations (mirror/silver/diamond) Summary

**Added mirror-shimmer, gleam, and diamond-sparkle idle tweens to BlastTile; wildcard cleaned from BLAST_TILE_CONFIGS type; 52 tests green across both suites**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-04T17:05:19Z
- **Completed:** 2026-03-04T17:19:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All 13 special tile types (excluding standard) now have type-specific idle animations in `startTypeSpecificTween()`
- mirror/silver/diamond entries confirmed in all 4 BlastTileRules lookup tables (TILE_TINTS, TILE_BORDERS, GLOW_BASES, BLAST_TILE_CONFIGS)
- wildcard removed from `BLAST_TILE_CONFIGS` (was orphaned; never spawned since Phase 47)
- reduceMotion and isLowEnd guards verified for all 3 new idle types

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mirror/silver/diamond to BlastTileRules + remove wildcard orphans** - `a1668b9c` (feat)
2. **Task 2: Add mirror/silver/diamond idle tweens to BlastTile.startTypeSpecificTween()** - `1672f9cd` (feat)

_Note: TDD — RED phase tests written first, then GREEN implementation, no separate REFACTOR needed._

## Files Created/Modified
- `fe-next/lib/phaser/logic/BlastTileRules.ts` - Removed wildcard from BLAST_TILE_CONFIGS; updated type to `Exclude<BlastTileType, 'standard' | 'wildcard'>`
- `fe-next/lib/phaser/logic/__tests__/BlastTileRules.test.ts` - Updated ALL_TYPES (14 types), SPECIAL_TYPES excludes wildcard, new mirror/silver/diamond test block (29 total tests)
- `fe-next/phaser/objects/BlastTile.ts` - Added mirror/silver/diamond switch cases; split gold from wildcard; badge guard for wildcard
- `fe-next/phaser/objects/__tests__/BlastTile.idle.test.ts` - 7 new tests: mirror-shimmer, gleam, diamond-sparkle + RTL alpha check + scale check + reduceMotion/isLowEnd guards (23 total tests)

## Decisions Made
- `BLAST_TILE_CONFIGS` type updated to also exclude `wildcard` — cleanest approach vs keeping a dead entry
- mirror idle uses alpha oscillation on overlay (not scaleX flip) — scaleX flip could look wrong in RTL layouts per research notes
- `BlastTile.ts` badge text lookup now guards `blastType !== 'wildcard'` for type safety

## Deviations from Plan

None - plan executed exactly as written. The `BlastTileRules.ts` already had partial implementation (mirror/silver/diamond in TILE_TINTS, TILE_BORDERS, GLOW_BASES) but was missing from the wildcard cleanup and badgeText values matched plan spec.

## Issues Encountered
- Existing `BlastTileRules.test.ts` had `SPECIAL_TYPES` that included `wildcard` — after removing wildcard from `BLAST_TILE_CONFIGS`, those config-focused tests broke. Fixed by updating `SPECIAL_TYPES` to exclude `wildcard` (aligns with its "excluded from BLAST_TILE_CONFIGS" semantics).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 13 special tile type idle animations complete (TILE-10 satisfied)
- Ready for Phase 51 Plan 02 (tile death animations or next plan in phase)
- No blockers

## Self-Check: PASSED
- SUMMARY.md: FOUND at .planning/phases/51-tile-idle-death-animations/51-01-SUMMARY.md
- Task 1 commit a1668b9c: FOUND
- Task 2 commit 1672f9cd: FOUND

---
*Phase: 51-tile-idle-death-animations*
*Completed: 2026-03-04*
