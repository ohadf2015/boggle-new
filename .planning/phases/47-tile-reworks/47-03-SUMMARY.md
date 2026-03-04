---
phase: 47-tile-reworks
plan: 03
subsystem: ui
tags: [blast, game-mechanics, special-tiles, vortex, frost, magnet, frozen, tdd, jest]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    plan: 02
    provides: clearTilesForWord infrastructure with Treasure Gem shard mechanic

provides:
  - Vortex mechanic (magnet rework): pull tiles within radius 2 toward center + explode radius 1
  - Frost mechanic (frozen rework): 2-hit reveal with hidden inner special activation
  - BlastTileState.innerType optional field for frost inner type storage
  - 6 new constants: VORTEX_PULL_RADIUS, VORTEX_EXPLODE_RADIUS, VORTEX_PULL_BONUS, VORTEX_EXPLODE_BONUS, FROST_HITS_REQUIRED, FROST_REVEAL_BONUS
  - 20 TDD tests verifying Vortex pull+explode and Frost 2-hit reveal mechanics

affects:
  - 47-04, 47-05 (same clearTilesForWord infrastructure)
  - Blast mode gameplay balance (vortex physically rearranges board; frost rewards persistence)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vortex pull: process from outermost ring inward (radius 2 then 1); swap toward cleared vortex center"
    - "Vortex explode: BFS-style clear within VORTEX_EXPLODE_RADIUS=1 after pull phase"
    - "Frost innerType: assigned at board generation via wave-gated, normalized rollSpecialFromDistribution"
    - "Frost inner activation: switch on innerType dispatching bomb BFS / lightning column / prism cross / gem conversion / rainbow multiplier"
    - "Gem conversion: un-clear frost tile and convert to gem type with hitsRemaining=3 (not cleared)"
    - "Distribution normalization: frostInnerDist normalized to 1.0 before passing to rollSpecialFromDistribution"

key-files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.vortexFrost.test.ts
  modified:
    - fe-next/shared/types/blast.ts
    - fe-next/components/blast/types.ts
    - fe-next/components/blast/utils/blastTileUtils.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/utils/__tests__/blastTileUtils.test.ts
    - fe-next/components/blast/__tests__/useBlastGame.magnet.test.ts

key-decisions:
  - "Vortex pull uses axis-preference movement: if |dr| >= |dc|, move along row axis first (avoids diagonal drift)"
  - "Vortex pull only swaps if target cell is cleared (vortex's own cleared position), prevents cascading clobber"
  - "Frost innerType distribution normalized to 1.0 (not raw wave weights) to avoid rollSpecialFromDistribution fallback to 'wildcard'"
  - "Frost innerType='gem': un-clear frost tile + convert type+hitsRemaining instead of spawning new tile (simpler state)"
  - "Frost innerType fallback: if no wave-eligible types, use {bomb: 0.5, rainbow: 0.5} (wave-1-safe)"
  - "Updated blastTileUtils.test.ts: frozen hits expectation 3→2 (Frost redesign is intentional)"
  - "Updated useBlastGame.magnet.test.ts: all old attract-wildcard tests replaced with Vortex pull+explode tests"
  - "FROZEN_CLEAR_BONUS constant kept in types.ts for backward compat, but replaced by FROST_REVEAL_BONUS in logic"

patterns-established:
  - "Inner type generation pattern: generate secondary type at board init, store in tile state for deferred activation"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 47 Plan 03: Vortex + Frost Mechanics Summary

**Magnet redesigned into Vortex (pull+explode creating board rearrangement) and Frozen redesigned into Frost (2-hit reveal activating a hidden inner special)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 7

## Accomplishments

- Added `innerType?: BlastTileType` to `BlastTileState` in `shared/types/blast.ts`
- Added 6 constants to `types.ts`: `VORTEX_PULL_RADIUS=2`, `VORTEX_EXPLODE_RADIUS=1`, `VORTEX_PULL_BONUS=2`, `VORTEX_EXPLODE_BONUS=2`, `FROST_HITS_REQUIRED=2`, `FROST_REVEAL_BONUS=3`
- Changed `getInitialHitsRemaining('frozen')` from 3 to 2 (FROST_HITS_REQUIRED)
- Wrote 20 TDD tests (RED phase): all 20 failing before implementation
- Implemented Vortex pull phase: processes radius 2→1 rings, swapping tiles toward cleared vortex center; awards VORTEX_PULL_BONUS per swap
- Implemented Vortex explode phase: clears tiles within VORTEX_EXPLODE_RADIUS=1 after pull; awards VORTEX_EXPLODE_BONUS per cleared tile; chain-propagates bombs
- Implemented Frost first-hit: `activationEffect='frost-crack'`, hitsRemaining 2→1
- Implemented Frost second-hit: `activationEffect='frost-free'`, awards FROST_REVEAL_BONUS
- Frost inner activation dispatches: bomb (BFS), lightning (column-clear), prism (cross-clear), gem (tile conversion), rainbow (2x multiplier)
- Frost innerType assigned at board generation via wave-gated, normalized distribution
- Updated 2 existing test files to reflect new behavior (not bugs — intentional redesign)
- All 696 blast tests pass (0 regressions)

## Task Commits

1. **Task 1: Write failing tests for Vortex and Frost mechanics** - `eea84bd8` (test)
2. **Task 2: Implement Vortex pull+explode and Frost two-hit reveal** - `686b3e57` (feat)

## Files Created/Modified

- `fe-next/components/blast/__tests__/useBlastGame.vortexFrost.test.ts` — 20 TDD tests (6 groups): Vortex constants, Vortex pull mechanics, Frost constants, Frost first hit, Frost second hit, Frost gem conversion
- `fe-next/shared/types/blast.ts` — Added `innerType?: BlastTileType` to BlastTileState
- `fe-next/components/blast/types.ts` — Added 6 Vortex + Frost constants
- `fe-next/components/blast/utils/blastTileUtils.ts` — Changed frozen hits 3→2 using FROST_HITS_REQUIRED
- `fe-next/components/blast/hooks/useBlastGame.ts` — Imported Vortex/Frost constants; generateTileStates assigns innerType to frozen tiles; case 'frozen' rewrite with frost-crack/frost-free + inner activation; case 'magnet' rewrite with pull+explode phases
- `fe-next/components/blast/utils/__tests__/blastTileUtils.test.ts` — Updated frozen hits expectation 3→2
- `fe-next/components/blast/__tests__/useBlastGame.magnet.test.ts` — Replaced attract-wildcard tests with Vortex pull+explode tests

## Decisions Made

- Vortex pull uses axis-preference movement (larger delta axis moved first) to keep movement predictable
- Vortex pull only swaps with cleared cells (the vortex's own cleared position) — prevents overwriting active tiles
- Frost innerType distribution normalized to sum=1.0 before rolling; prevents 'wildcard' fallback when wave-1 excludes most types
- Frost innerType='gem' converts the frost tile in-place (un-clear + change type) rather than spawning new tile — simpler state management
- Safe defaults for frost inner when wave gating excludes all candidates: {bomb: 0.5, rainbow: 0.5}

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Frost innerType rolled as 'wildcard' (distribution normalization)**
- **Found during:** Task 2 (first test run showed 1/20 failing)
- **Issue:** `effectiveFrostInnerDist` values summed to ~0.44 (bomb=0.22 + rainbow=0.22) so `rollSpecialFromDistribution` fell through to 'wildcard' fallback for random rolls > 0.44
- **Fix:** Added normalization step — divide each weight by total before passing to `rollSpecialFromDistribution`
- **Files modified:** `fe-next/components/blast/hooks/useBlastGame.ts`
- **Commit:** `686b3e57`

**2. [Rule 1 - Test Update] blastTileUtils.test.ts frozen=3 expectation**
- **Found during:** Task 2 regression check
- **Issue:** Old test expected frozen hitsRemaining=3; Frost redesign intentionally changes this to 2
- **Fix:** Updated test description and expected value to 2 (design change, not a test error)
- **Files modified:** `fe-next/components/blast/utils/__tests__/blastTileUtils.test.ts`
- **Commit:** `686b3e57`

**3. [Rule 1 - Test Update] useBlastGame.magnet.test.ts old attract-wildcard tests**
- **Found during:** Task 2 regression check (3 tests failing)
- **Issue:** Old magnet tests tested attract-wildcard behavior; Vortex redesign completely replaces this with pull+explode
- **Fix:** Rewrote test file to test Vortex behavior (explosion event, radius-1 clearing, score above base)
- **Files modified:** `fe-next/components/blast/__tests__/useBlastGame.magnet.test.ts`
- **Commit:** `686b3e57`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Vortex and Frost fully functional and tested
- `clearTilesForWord` infrastructure ready for 47-04 (Mirror tile / Diamond rework)
- 696 blast tests pass, 0 regressions
- No blockers

## Self-Check: PASSED
- `fe-next/components/blast/__tests__/useBlastGame.vortexFrost.test.ts` — FOUND
- `fe-next/shared/types/blast.ts` — FOUND (contains innerType)
- `fe-next/components/blast/types.ts` — FOUND (contains VORTEX_PULL_RADIUS, FROST_HITS_REQUIRED)
- `fe-next/components/blast/hooks/useBlastGame.ts` — FOUND (contains case 'magnet' Vortex rewrite)
- Commit `eea84bd8` — FOUND
- Commit `686b3e57` — FOUND

---
*Phase: 47-tile-reworks*
*Completed: 2026-03-04*
