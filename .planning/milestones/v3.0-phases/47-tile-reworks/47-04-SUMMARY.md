---
phase: 47-tile-reworks
plan: 04
subsystem: ui
tags: [blast, game-mechanics, special-tiles, mirror, wildcard-removal, gold-tier, silver, diamond, tdd, jest]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    plan: 03
    provides: clearTilesForWord infrastructure with Vortex+Frost mechanics

provides:
  - Mirror tile mechanic: copies FIRST offensive special in path (doubles effect), solo = 2x word score
  - Wildcard fully removed from type union, distribution, switch cases, and fallback strings
  - Silver tile: 1.5x word score multiplier
  - Diamond tile: 5x word score multiplier
  - Gold tier system: Silver/Gold/Diamond all apply multiplicative goldMultiplier
  - 4 new constants: MIRROR_MULTIPLIER=2, SILVER_MULTIPLIER=1.5, DIAMOND_MULTIPLIER=5
  - 26 TDD tests verifying Mirror mechanics, Wildcard removal, and Gold tier system

affects:
  - 47-05 (spawn distribution tables will activate mirror/silver/diamond with real weights)
  - Blast mode gameplay balance (mirror creates "amplifier combo" moments)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mirror pre-scan: finds FIRST offensive special in path (vs Rainbow which finds BEST)"
    - "Mirror solo: mirrorSoloMultiplier applied to effectiveBase before goldMultiplier"
    - "Combined solo multipliers multiplicative: effectiveBase = base * rainbowSoloMult * mirrorSoloMult"
    - "Gold tier unified: silver/gold/diamond all multiply goldMultiplier variable"
    - "SPECIAL_TILE_DISTRIBUTION: wildcard removed, share redistributed equally to gold/bomb/rainbow/ice (0.25 each)"

key-files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts
  modified:
    - fe-next/shared/types/blast.ts
    - fe-next/components/blast/types.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/utils/blastLetterGenerator.ts
    - fe-next/components/blast/utils/blastTileUtils.ts
    - fe-next/shared/types/__tests__/blast.test.ts
    - fe-next/components/blast/__tests__/blastLetterGenerator.test.ts

key-decisions:
  - "Mirror picks FIRST offensive special in path (not best) to differentiate it from Rainbow"
  - "Mirror and Rainbow solo multipliers are both applied via effectiveBase multiplicatively"
  - "SPECIAL_TILE_DISTRIBUTION: wildcard 0.17 redistributed equally to existing 4 types → 0.25 each"
  - "Silver/Diamond use same goldMultiplier variable as Gold (multiplicative tier stacking)"
  - "Mirror case in clearTilesForWord fires simplified vortex explode for 'magnet' amplification"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-03-04
---

# Phase 47 Plan 04: Mirror Tile + Wildcard Removal + Gold Tiers Summary

**Mirror doubles partner's effect; Wildcard fully removed; Silver (1.5x) and Diamond (5x) tiers added alongside Gold (3x)**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 8

## Accomplishments

- Updated `BlastTileType` union: removed 'wildcard', added 'mirror', 'silver', 'diamond' (11 → 13 types)
- Updated `BLAST_TILE_TYPE_LIST` to match (13 entries)
- Added constants: `MIRROR_MULTIPLIER=2`, `SILVER_MULTIPLIER=1.5`, `DIAMOND_MULTIPLIER=5`
- Updated `SPECIAL_TILE_DISTRIBUTION`: removed wildcard (0.17), redistributed to gold/bomb/rainbow/ice (0.25 each)
- Added new types with zero initial weight: mirror=0, silver=0, diamond=0
- Wrote 26 TDD tests (RED phase): tested Mirror+Bomb, Mirror+Lightning, Mirror solo, Mirror+Rainbow+Bomb, wildcard removal, Silver/Gold/Diamond tier multipliers
- Implemented Mirror pre-scan: finds FIRST offensive special in path (differs from Rainbow which finds BEST)
- Implemented `case 'mirror'`: re-fires first special when partner present; applies 2x solo multiplier when alone
- Removed `case 'wildcard'` from `clearTilesForWord` switch
- Changed `rollSpecialFromDistribution` fallback: 'wildcard' → 'standard'
- Changed `rollSpecialType` fallback: 'wildcard' → 'standard'
- Removed `target.type === 'wildcard'` from Rainbow Boost magnet attraction check
- Implemented `case 'silver'`: `goldMultiplier *= SILVER_MULTIPLIER`
- Implemented `case 'diamond'`: `goldMultiplier *= DIAMOND_MULTIPLIER`
- Added `getInitialHitsRemaining` cases for mirror/silver/diamond (return 0, cleared on first hit)
- Updated `blastLetterGenerator.test.ts`: removed wildcard from valid type assertions
- All 724 blast tests pass (0 regressions)

## Task Commits

1. **Task 1: Add failing tests for Mirror, Wildcard removal, and Gold tier system** - `ec1b6593` (test)
2. **Task 2: Implement Mirror tile, remove Wildcard, add Silver/Diamond tiers** - `8968cf54` (feat)

## Files Created/Modified

- `fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts` — 26 TDD tests: constants, wildcard removal, Mirror+Bomb, Mirror+Lightning, Mirror solo, Mirror+Rainbow+Bomb, Silver/Gold/Diamond tiers, mixed tier multiplicative
- `fe-next/shared/types/blast.ts` — BlastTileType union updated (13 types: -wildcard, +mirror/silver/diamond)
- `fe-next/shared/types/__tests__/blast.test.ts` — Updated count 11→13, assertions for wildcard absent, new types present
- `fe-next/components/blast/types.ts` — Added MIRROR_MULTIPLIER, SILVER_MULTIPLIER, DIAMOND_MULTIPLIER; updated SPECIAL_TILE_DISTRIBUTION (removed wildcard, added mirror/silver/diamond at 0, redistributed 0.17 to 0.25 each for active types)
- `fe-next/components/blast/hooks/useBlastGame.ts` — Imported new constants; added Mirror pre-scan; added case 'mirror' (with sub-cases for bomb/lightning/prism/gem/magnet amplification); removed case 'wildcard'; added case 'silver' and 'diamond'; fixed rollSpecialFromDistribution fallback; applied mirrorSoloMultiplier to effectiveBase
- `fe-next/components/blast/utils/blastLetterGenerator.ts` — Fixed rollSpecialType fallback: 'wildcard' → 'standard'
- `fe-next/components/blast/utils/blastTileUtils.ts` — Added getInitialHitsRemaining cases for mirror/silver/diamond
- `fe-next/components/blast/__tests__/blastLetterGenerator.test.ts` — Updated valid types lists (removed 'wildcard'), fixed distribution test assertions

## Decisions Made

- Mirror picks FIRST offensive special (not best) to differentiate from Rainbow Boost
- Mirror and Rainbow solo multipliers both applied multiplicatively via `effectiveBase` (not additive)
- Wildcard's 0.17 distribution weight redistributed equally to existing active types (gold/bomb/rainbow/ice → 0.25 each)
- Silver and Diamond reuse same `goldMultiplier` variable as Gold (clean multiplicative tier stacking)
- Mirror's amplification of 'magnet' fires the vortex explode phase only (not pull, which is position-dependent)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Fix] Mirror solo test accounted for triple_special combo bonus**
- **Found during:** Task 2 (test failed: expected 10, received 15)
- **Issue:** With 4+ special tiles in path, `detectSpecialCombos` fires `triple_special` (scoreMultiplier=2), adding `baseScore * 1 = 5` to bonusScore. `effectiveBase(10) + bonusScore(5) = 15 ≠ 10`.
- **Fix:** Changed mirror solo hook test to use 2-tile path (avoids triple_special threshold of ≥3 specials). Added pure simulation test to verify logic independently.
- **Files modified:** `fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts`
- **Commit:** `8968cf54`

**2. [Rule 1 - Bug] SPECIAL_TILE_DISTRIBUTION didn't sum to 1.0 after wildcard removal**
- **Found during:** Task 2 regression check (blastLetterGenerator.test.ts: `counts.standard` was 162, expected 0)
- **Issue:** Removing wildcard (0.17) left distribution sum at 0.83. `rollSpecialType` fallback ('standard') fired for rolls > 0.83 (~17% of cases).
- **Fix:** Redistributed wildcard's 0.17 equally to gold/bomb/rainbow/ice (0.22 → 0.25 each). Sum = 1.0.
- **Files modified:** `fe-next/components/blast/types.ts`, `fe-next/components/blast/__tests__/blastLetterGenerator.test.ts`
- **Commit:** `8968cf54`

**3. [Rule 1 - Test Update] blastLetterGenerator.test.ts wildcard references**
- **Found during:** Task 2 regression check
- **Issue:** Tests referenced 'wildcard' in validTypes arrays and counts object, causing test failures after wildcard removal.
- **Fix:** Updated valid type lists to remove 'wildcard'; updated counts object for distribution test.
- **Files modified:** `fe-next/components/blast/__tests__/blastLetterGenerator.test.ts`
- **Commit:** `8968cf54`

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Mirror, Silver, Diamond tile mechanics fully functional and tested
- Wildcard completely removed from all code paths
- `clearTilesForWord` infrastructure ready for 47-05 (spawn tables / wave config)
- 724 blast tests pass, 0 regressions
- No blockers

## Self-Check: PASSED
- `fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts` — FOUND
- `fe-next/shared/types/blast.ts` — FOUND (contains 'mirror', no 'wildcard')
- `fe-next/components/blast/types.ts` — FOUND (contains MIRROR_MULTIPLIER, SILVER_MULTIPLIER, DIAMOND_MULTIPLIER)
- `fe-next/components/blast/hooks/useBlastGame.ts` — FOUND (contains case 'mirror', case 'silver', case 'diamond')
- Commit `ec1b6593` — FOUND
- Commit `8968cf54` — FOUND

---
*Phase: 47-tile-reworks*
*Completed: 2026-03-04*
