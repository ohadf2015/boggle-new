---
phase: 50-psychological-hooks
plan: "04"
subsystem: ui
tags: [blast, dda, difficulty-adjustment, special-tiles, game-feel]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    provides: blastLetterGenerator.rollSpecialType, blastGravity.computeGravityResult
  - phase: 48-combination-system
    provides: useBlastGame hook with clearTilesForWord

provides:
  - Invisible DDA state machine (blastDDA.ts) — pure immutable functions
  - rollSpecialType spawnModifier param — adjusts special tile spawn probability
  - computeGravityResult spawnModifier forwarding to refill rolls
  - useBlastGame.trackWordFail() — rejection tracking for DDA
  - BlastGame wires DDA rejection detection via currentFeedback effect

affects:
  - 50-psychological-hooks (other plans using blast game feel)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DDA via immutable pure state machine (createDDAState/updateDDA/getDDASpawnModifier)"
    - "Ref-based DDA state avoids re-renders; cascade callbacks read latest without stale closure"
    - "Optional parameter with conditional clamping: spawnModifier only clamps when non-zero"

key-files:
  created:
    - fe-next/components/blast/utils/blastDDA.ts
    - fe-next/components/blast/utils/__tests__/blastDDA.test.ts
    - fe-next/components/blast/utils/__tests__/blastLetterGenerator.test.ts
  modified:
    - fe-next/components/blast/utils/blastLetterGenerator.ts
    - fe-next/components/blast/utils/blastGravity.ts
    - fe-next/components/blast/hooks/useBlastCascade.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/BlastGame.tsx

key-decisions:
  - "Clamping only applied when spawnModifier != 0: preserves 100% special tile behavior in existing tests (used in test fixtures)"
  - "DDA state in useRef (not useState): cascade callbacks always read latest modifier without re-render or stale closure"
  - "trackWordFail exposed from useBlastGame; BlastGame detects rejection via useEffect on currentFeedback.id dedup pattern"
  - "DDA resets per-game naturally: useRef(createDDAState()) fresh on each hook mount (one hook per wave)"
  - "Boost takes priority over normalization: consecutiveFails >= 3 always returns +0.15 even if successRate also high"
  - "startCascade gains optional spawnModifier param; cascade-detected words use 0 (player didn't submit those)"

patterns-established:
  - "Pure immutable state machine: BlastDDAState with createDDAState/updateDDA/getDDASpawnModifier"
  - "Ref-based tracking pattern for DDA similar to tileStatesRef/gameStateRef pattern"

requirements-completed: [PSYC-04]

# Metrics
duration: 7min
completed: 2026-03-04
---

# Phase 50 Plan 04: Invisible Assist DDA Summary

**Immutable DDA state machine (blastDDA.ts) silently boosts special tile spawn +15% after 3+ consecutive word failures and normalizes -10% after >80% success rate over 5 words, wired end-to-end through gravity refill**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-04T15:52:15Z
- **Completed:** 2026-03-04T15:59:00Z
- **Tasks:** 2 TDD cycles (RED+GREEN)
- **Files modified:** 8

## Accomplishments

- Pure DDA state machine with immutable transitions: tracks consecutiveFails and rolling 5-result window
- rollSpecialType gains optional `spawnModifier` param clamped to [0.05, 0.95] only when modifier is non-zero
- Full pipeline wired: word fail/accept → ddaStateRef → getDDASpawnModifier → startCascade → computeGravityResult → rollSpecialType
- 43 new tests (20 blastDDA, 23 blastLetterGenerator) all green; all 955 existing blast tests preserved

## Task Commits

1. **Task 1-2 (TDD RED+GREEN): DDA state machine + rollSpecialType modifier** - `75a489bd` (feat)
2. **Task 3: Wire DDA into gravity refill + rejection tracking** - `b161fc61` (feat)

## Files Created/Modified

- `fe-next/components/blast/utils/blastDDA.ts` - Pure DDA state machine: createDDAState, updateDDA, getDDASpawnModifier, DDA_BOOST_PERCENT/DDA_REDUCE_PERCENT
- `fe-next/components/blast/utils/__tests__/blastDDA.test.ts` - 20 tests covering all state transitions and modifier thresholds
- `fe-next/components/blast/utils/__tests__/blastLetterGenerator.test.ts` - 8 new tests for spawnModifier + clamping behavior
- `fe-next/components/blast/utils/blastLetterGenerator.ts` - rollSpecialType gains optional spawnModifier param with conditional clamping
- `fe-next/components/blast/utils/blastGravity.ts` - computeGravityResult forwards spawnModifier to rollSpecialType
- `fe-next/components/blast/hooks/useBlastCascade.ts` - startCascade gains optional spawnModifier param
- `fe-next/components/blast/hooks/useBlastGame.ts` - ddaStateRef, trackWordFail(), updateDDA on clearTilesForWord success, getDDASpawnModifier passed to cascade
- `fe-next/components/blast/BlastGame.tsx` - useEffect detects rejected feedback → blast.trackWordFail()

## Decisions Made

- Clamping only when `spawnModifier != 0` to preserve existing test fixtures that call `rollSpecialType(1, customDist)` expecting 100% special tiles
- `ddaStateRef` pattern (not useState) matches the existing `tileStatesRef`/`gameStateRef` pattern — cascade closures read latest without re-render
- `trackWordFail` exposed as public API from `useBlastGame`; rejection detected in `BlastGame.tsx` via `currentFeedback.id` dedup guard
- DDA resets per wave naturally since `useBlastGame` is mounted fresh each wave
- Boost takes priority over normalization (failure help > success penalty)
- Cascade auto-detected words use `spawnModifier = 0` (not the player's DDA state — they're auto-clear, not player failures)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] rollSpecialType clamping broke existing tests**
- **Found during:** Task 2 (GREEN phase verification)
- **Issue:** Original `Math.min(0.95, Math.max(0.05, specialTileChance + spawnModifier))` applied to base chance even when modifier = 0, breaking existing tests that pass `chance = 1.0` expecting 100% special tiles
- **Fix:** Clamping only applied when `spawnModifier !== 0`; base chance used as-is otherwise
- **Files modified:** fe-next/components/blast/utils/blastLetterGenerator.ts
- **Verification:** All 43 new tests + 25 existing rollSpecialType tests pass
- **Committed in:** `75a489bd` (part of feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Fix essential for backward compatibility, no scope creep.

## Issues Encountered

- `useWordSubmission` from `@/components/singleplayer/game/hooks/useWordSubmission` lacks `onWordRejected` — different interface from the hook in `@/hooks/useWordSubmission`. Resolved by using `useEffect` watching `currentFeedback.type === 'rejected'` in BlastGame.tsx.

## Next Phase Readiness

- PSYC-04 complete: invisible DDA wired end-to-end
- No UI changes — player never sees the assist
- Phase 50 plan 04 done; remaining plan 50-05 (if any) can build on DDA foundation

## Self-Check: PASSED

- FOUND: fe-next/components/blast/utils/blastDDA.ts
- FOUND: fe-next/components/blast/utils/__tests__/blastDDA.test.ts
- FOUND: fe-next/components/blast/utils/__tests__/blastLetterGenerator.test.ts
- FOUND: 75a489bd (feat: implement DDA state machine)
- FOUND: b161fc61 (feat: wire DDA modifier)

---
*Phase: 50-psychological-hooks*
*Completed: 2026-03-04*
