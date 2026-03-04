---
phase: 53-wildcard-type-cleanup
plan: 01
subsystem: testing
tags: [blast, tile-types, typescript, type-cleanup]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    provides: wildcard removal from spawn distribution (type left behind)
  - phase: 51-tile-idle-death-animations
    provides: BLAST_TILE_CONFIGS Exclude type referencing wildcard
provides:
  - Clean 13-member BlastTileType union with no wildcard
  - All Record<BlastTileType> objects free of wildcard keys
  - All blast-related tests aligned with 13-type reality
affects: [any future phase using BlastTileType, BLAST_TILE_TYPE_LIST, BLAST_TILE_BONUSES]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BlastTileType is now exactly 13 members; BLAST_TILE_TYPE_LIST.length === 13

key-files:
  created: []
  modified:
    - fe-next/shared/types/blast.ts
    - fe-next/shared/constants/blastMultiplayerConstants.ts
    - fe-next/components/blast/types.ts
    - fe-next/lib/phaser/logic/BlastTileRules.ts
    - fe-next/phaser/objects/BlastTile.ts
    - fe-next/shared/types/__tests__/blast.test.ts
    - fe-next/backend/modules/__tests__/blastModeManager.test.ts
    - fe-next/lib/phaser/logic/__tests__/BlastTileRules.test.ts
    - fe-next/components/blast/utils/__tests__/blastLevelClear.test.ts
    - fe-next/components/blast/__tests__/useBlastGame.treasureGem.test.ts
    - fe-next/components/blast/__tests__/useBlastGame.rainbowBoost.test.ts
    - fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts

key-decisions:
  - "Phase 53: wildcard fully removed from BlastTileType union (not just from spawn distribution) — type now has 13 members"
  - "BLAST_TILE_CONFIGS Exclude now only excludes standard, not standard|wildcard"
  - "blastLevelClear wildcard test tile replaced with mirror tile (same trigger behavior, valid type)"

patterns-established:
  - "BLAST_TILE_TYPE_LIST.length === 13 is the canonical assertion for completeness tests"

requirements-completed: [TILE-06, TILE-08, SYNC-01]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 53 Plan 01: Wildcard Type Cleanup Summary

**Removed 'wildcard' from BlastTileType union (14->13), all Record<BlastTileType> objects, and updated 8 test files to eliminate contradictory assertions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T19:01:18Z
- **Completed:** 2026-03-04T19:04:41Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Removed `'wildcard'` from `BlastTileType` union and `BLAST_TILE_TYPE_LIST` (14 → 13 members)
- Removed wildcard keys from all downstream Record objects: `BLAST_TILE_BONUSES`, `SPECIAL_TILE_DISTRIBUTION`, `TILE_TINTS`, `TILE_BORDERS`, `GLOW_BASES`
- Updated 8 test files — all 148 targeted tests now pass with accurate 13-type assertions
- TypeScript compiles cleanly with 0 errors after union change

## Task Commits

1. **Task 1: Remove wildcard from type union, list, and all Record objects** - `77afa53c` (feat)
2. **Task 2: Update all test files with contradictory wildcard assertions** - `dc97acaa` (fix)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `fe-next/shared/types/blast.ts` - BlastTileType union 14→13 members, list updated
- `fe-next/shared/constants/blastMultiplayerConstants.ts` - `wildcard: 1` removed from BLAST_TILE_BONUSES
- `fe-next/components/blast/types.ts` - `wildcard: 0` removed from SPECIAL_TILE_DISTRIBUTION, JSDoc updated
- `fe-next/lib/phaser/logic/BlastTileRules.ts` - wildcard removed from TILE_TINTS/TILE_BORDERS/GLOW_BASES, BLAST_TILE_CONFIGS Exclude updated, stale comment removed
- `fe-next/phaser/objects/BlastTile.ts` - removed `blastType !== 'wildcard'` guard in badge update
- `fe-next/shared/types/__tests__/blast.test.ts` - toHaveLength(13), wildcard absent assertion
- `fe-next/backend/modules/__tests__/blastModeManager.test.ts` - 14→13, wildcard excluded
- `fe-next/lib/phaser/logic/__tests__/BlastTileRules.test.ts` - ALL_TYPES 14→13, wildcard filter removed
- `fe-next/components/blast/utils/__tests__/blastLevelClear.test.ts` - wildcard tile replaced with mirror
- `fe-next/components/blast/__tests__/useBlastGame.treasureGem.test.ts` - comment updated
- `fe-next/components/blast/__tests__/useBlastGame.rainbowBoost.test.ts` - dead wildcard guard removed
- `fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts` - backward-compat assertion flipped to absence check

## Decisions Made
- Wildcard fully removed from type union (not kept for backward compat) — Phase 47 already removed it from spawn distribution, Phase 53 completes the cleanup
- `BLAST_TILE_CONFIGS` `Exclude` type simplified from `Exclude<BlastTileType, 'standard' | 'wildcard'>` to `Exclude<BlastTileType, 'standard'>` since wildcard no longer exists
- `blastLevelClear` wildcard test tile replaced with `mirror` (same behavior: non-standard tile in auto-trigger sequence)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed contradictory assertion in useBlastGame.mirrorGoldTier.test.ts**
- **Found during:** Task 2 (test file updates) — test run revealed 1 failing test
- **Issue:** `useBlastGame.mirrorGoldTier.test.ts` had `expect(BLAST_TILE_TYPE_LIST).toContain('wildcard')` labeled as "backward compat" — this contradicts the plan's goal of removing wildcard from the list
- **Fix:** Flipped assertion to `expect(BLAST_TILE_TYPE_LIST).not.toContain('wildcard')` and updated description
- **Files modified:** `fe-next/components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts`
- **Verification:** All 148 targeted tests pass after fix
- **Committed in:** `dc97acaa` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — contradictory test assertion)
**Impact on plan:** Required fix; the test was a leftover from when wildcard was being partially removed. No scope creep.

## Issues Encountered
None — plan executed cleanly with one auto-fix for a contradictory test.

## Next Phase Readiness
- BlastTileType is now the clean 13-member canonical source of truth
- All downstream consumers (MP constants, Phaser visuals, component types) are consistent
- No remaining wildcard references in source files

---
*Phase: 53-wildcard-type-cleanup*
*Completed: 2026-03-04*
