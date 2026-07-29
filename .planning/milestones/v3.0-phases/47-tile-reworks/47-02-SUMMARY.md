---
phase: 47-tile-reworks
plan: 02
subsystem: ui
tags: [blast, game-mechanics, special-tiles, gem, treasure-gem, tdd, jest]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    plan: 01
    provides: clearTilesForWord infrastructure with Rainbow Boost + multi-hit tile handling

provides:
  - Treasure Gem mechanic: 3-hit shard collector with gem-shard-1/gem-shard-2/gem-complete activationEffects
  - TREASURE_GEM_COMPLETION_BONUS (25) / TREASURE_GEM_SPAWN_COUNT (2) / TREASURE_GEM_HITS_REQUIRED (3) constants
  - 18 TDD tests verifying shard progression, bonus, spawning, wave-gating, persistence
  - currentWave option added to UseBlastGameOptions for spawn distribution gating

affects:
  - 47-03, 47-04, 47-05 (same clearTilesForWord infrastructure)
  - Blast mode gameplay balance (gem redesign: flat +11 → 3-hit +25)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Treasure Gem pre-count pattern: gemsCompletedThisWord counter incremented in case 'gem'"
    - "Post-loop spawn: after path loop, convert standard tiles to wave-gated specials"
    - "Shard activationEffect: hitsRemaining after decrement maps to gem-shard-1/gem-shard-2"
    - "Wave distribution gating: getWaveConfig(currentWave) + getWaveDistribution() filters spawn pool"

key-files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.treasureGem.test.ts
  modified:
    - fe-next/components/blast/types.ts
    - fe-next/components/blast/hooks/useBlastGame.ts

key-decisions:
  - "Remove GEM_USE_BONUS from non-final gem hits: Treasure Gem redesign makes per-hit bonus obsolete"
  - "gemsCompletedThisWord counter in path loop; spawn logic runs after path loop (before bomb BFS)"
  - "Spawn distribution excludes standard+gem types, normalizes wave dist, uses Math.random() for variety"
  - "currentWave option defaults to 1 (wave 1 disables lightning/magnet/prism/frozen from spawns)"
  - "Two gems completing in same word each spawn TREASURE_GEM_SPAWN_COUNT specials (correct: 2 gems = 4 spawns)"

patterns-established:
  - "Post-path-loop secondary effects: gem completion spawning follows same pattern as bomb BFS"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-03-04
---

# Phase 47 Plan 02: Treasure Gem Mechanic Summary

**Gem redesigned from flat +11 bonus into 3-hit shard collector: each hit shows shard progress, completing all 3 awards +25 and spawns 2 random wave-gated specials**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Added `TREASURE_GEM_HITS_REQUIRED = 3`, `TREASURE_GEM_COMPLETION_BONUS = 25`, `TREASURE_GEM_SPAWN_COUNT = 2` to `types.ts`
- Wrote 18 TDD tests (RED phase): 7 failing, 11 passing at start
- Modified multi-hit gem handling: shard-specific `activationEffect` (`gem-shard-1` / `gem-shard-2`) instead of generic `gem-crack`
- Removed `GEM_USE_BONUS` from non-final gem hits (no per-hit bonus in Treasure Gem system)
- Rewrote `case 'gem'`: sets `gem-complete` activationEffect, awards `TREASURE_GEM_COMPLETION_BONUS` (+25)
- After path loop: spawns `TREASURE_GEM_SPAWN_COUNT` random specials per completed gem
- Spawn respects wave-enabled flags via `getWaveDistribution(getWaveConfig(currentWave))`
- Added `currentWave` option to `UseBlastGameOptions` (default: 1)
- Updated Rainbow Boost gem second-firing to use `TREASURE_GEM_COMPLETION_BONUS` (not old `GEM_COLLECT_BONUS`)
- All 18 treasure gem tests pass; 675 blast tests pass (0 regressions)

## Task Commits

1. **Task 1: Write failing tests for Treasure Gem shard mechanics** - `c1a7148a` (test)
2. **Task 2: Implement Treasure Gem shard collector** - `3e24fd75` (feat)

## Files Created/Modified
- `fe-next/components/blast/__tests__/useBlastGame.treasureGem.test.ts` — 18 TDD tests (6 groups): constants, shard-1, shard-2, completion, spawning, wave-gating, persistence, bonus removal
- `fe-next/components/blast/types.ts` — Added 3 TREASURE_GEM_* constants; kept GEM_USE_BONUS/GEM_COLLECT_BONUS for reference
- `fe-next/components/blast/hooks/useBlastGame.ts` — Multi-hit gem shard effects, removed per-hit bonus, case 'gem' rewrite with completion bonus + spawning, currentWave option

## Decisions Made
- Remove `GEM_USE_BONUS` from non-final gem hits — old per-hit bonus is incompatible with Treasure Gem's shard anticipation design
- `gemsCompletedThisWord` counter tracks completed gems inside path loop; spawning logic runs after loop (avoids interference with path tile processing)
- Wave distribution: `getWaveDistribution` normalizes to 1.0 and excludes `standard` + `gem` from spawn pool
- Two gems completing in the same word each independently spawn specials (4 total for 2-gem path)
- `currentWave` defaults to 1 ensuring no wave-gated types appear unless explicitly configured

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Test design issue on first attempt: with `GEM_ONLY_DIST + specialTileChance: 1.0`, ALL tiles are gems including the second path tile. Revised test expectations to account for 2 gems in path (not 1). Tests updated before RED phase commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Treasure Gem fully functional and tested
- `clearTilesForWord` infrastructure ready for 47-03 (Mirror tile)
- No blockers

## Self-Check: PASSED
- `fe-next/components/blast/__tests__/useBlastGame.treasureGem.test.ts` — FOUND
- `fe-next/components/blast/types.ts` — FOUND (contains TREASURE_GEM_COMPLETION_BONUS)
- `fe-next/components/blast/hooks/useBlastGame.ts` — FOUND (contains TREASURE_GEM)
- Commit `c1a7148a` — FOUND
- Commit `3e24fd75` — FOUND

---
*Phase: 47-tile-reworks*
*Completed: 2026-03-04*
