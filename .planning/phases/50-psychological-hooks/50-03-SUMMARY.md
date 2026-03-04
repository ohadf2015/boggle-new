---
phase: 50-psychological-hooks
plan: 03
subsystem: blast-mode
tags: [sugar-crush, end-sequence, psychological-hooks, tdd, animations]
dependency_graph:
  requires: [50-01]
  provides: [PSYC-03-sugar-crush-sequence]
  affects: [BlastGame, useBlastGame]
tech_stack:
  added: []
  patterns: [staggered-setTimeout-chain, functional-updater-pattern, ref-stable-callback]
key_files:
  created:
    - fe-next/components/blast/utils/blastSugarCrush.ts
    - fe-next/components/blast/utils/__tests__/blastSugarCrush.test.ts
    - fe-next/components/blast/hooks/useBlastSugarCrush.ts
    - fe-next/components/blast/hooks/__tests__/useBlastSugarCrush.test.ts
  modified:
    - fe-next/components/blast/BlastGame.tsx
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/translations/en.js
    - fe-next/translations/he.js
    - fe-next/translations/sv.js
    - fe-next/translations/ja.js
decisions:
  - onMovesExhausted callback added to UseBlastGameOptions: delegates isDeadEnd timing to BlastGame, enabling sugar crush to run before game ends
  - Sugar crush tile selection: Fisher-Yates shuffle on candidates, capped at 8 tiles
  - Escalating types: bomb (low/300ms) -> lightning or prism (medium/250ms) -> rainbow (high/200ms)
  - Phase boundaries: ~25% low, middle remainder medium, ~25% high (at least 1 tile each when total >= 4)
  - Per-step bonus score of 10 pts accumulated and reported to onComplete
  - Grid blocked during sequence via existing isDiscoveryActive pattern in BlastGameLayout
  - blastEndGameRef/blastTileStatesRef pattern: stable refs avoid stale closures in onMovesExhausted
  - SUGAR_CRUSH_STAGGER_MS = 300 base constant exported for potential external use
metrics:
  duration_seconds: 418
  completed_date: "2026-03-04"
  tasks_completed: 3
  files_changed: 10
  tests_added: 35
---

# Phase 50 Plan 03: Sugar Crush End-of-Level Sequence Summary

Sugar Crush end-of-level sequence (PSYC-03): spectacular finale firing when moves run out — converts remaining standard tiles to escalating specials in a staggered chain reaction, providing reward regardless of score.

## What Was Built

**blastSugarCrush.ts (pure logic):**
- `planSugarCrush(tileStates, gridSize)` — selects up to 8 uncleared standard tiles via Fisher-Yates shuffle, assigns escalating intensity phases
- Low (first ~25%): bomb conversions at 300ms stagger
- Medium (middle): lightning or prism at 250ms stagger
- High (last ~25%): rainbow at 200ms stagger (fastest, most spectacular)
- `SUGAR_CRUSH_STAGGER_MS = 300` exported constant
- Returns empty array when no standard tiles available

**useBlastSugarCrush.ts (React hook):**
- `isActive: boolean` — true while sequence runs
- `start(tileStates, gridSize, setTileStates, addExplosion, addScore, onComplete)` — plans and executes staggered sequence
- Each step: converts tile type in-place, fires explosion visual, adds 10 pts bonus score
- `cancel()` — clears all pending timers immediately
- Unmount cleanup via mounted ref + timer tracking

**BlastGame.tsx wiring:**
- `onMovesExhausted` callback passed to `useBlastGame` intercepts the moves=0 condition
- Sugar crush fires instead of immediate `isDeadEnd: true`
- Grid blocked during sequence (`isDiscoveryActive || sugarCrush.isActive`)
- After crush: `blast.endGame()` transitions to results with accumulated score

**useBlastGame.ts additions:**
- `onMovesExhausted` option: delegates isDeadEnd timing to caller
- `setTileStates` exposed in return (direct state setter for Sugar Crush)
- `addExplosion(row, col, tileType)` — adds visual explosion at grid position
- `addBonusScore(bonus)` — adds score to game state

**Translations:** `blast.sugarCrush` added to en/he/sv/ja

## Tests: 35 new (19 + 16)

`blastSugarCrush.test.ts`: 19 tests covering empty grid cases, step structure, tile selection constraints, intensity pattern, delay timing, small grids.

`useBlastSugarCrush.test.ts`: 16 tests covering initial state, start behavior, step execution order, cancel(), unmount cleanup, tile conversion correctness.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one architectural addition.

### Architectural Addition (documented for transparency)

**Added `onMovesExhausted` callback + `setTileStates`/`addExplosion`/`addBonusScore` to `useBlastGame`**

- Found during: Task 3 (wiring)
- Issue: Plan specified sugar crush triggers from BlastGame when moves hit 0, but `useBlastGame` auto-set `isDeadEnd: true` internally with no hook for BlastGame to intercept
- Fix: Added `onMovesExhausted` to `UseBlastGameOptions` — when provided, delegates `isDeadEnd` timing to caller. Also exposed `setTileStates`, `addExplosion`, `addBonusScore` for the crush sequence to use
- Files modified: `fe-next/components/blast/hooks/useBlastGame.ts`
- Commits: `0abd28be`

This is consistent with the plan's intent ("intercept the movesRemaining <= 0 path") and required minimal hook modification.

## Self-Check

### Files created:
- fe-next/components/blast/utils/blastSugarCrush.ts — FOUND
- fe-next/components/blast/utils/__tests__/blastSugarCrush.test.ts — FOUND
- fe-next/components/blast/hooks/useBlastSugarCrush.ts — FOUND
- fe-next/components/blast/hooks/__tests__/useBlastSugarCrush.test.ts — FOUND

### Commits:
- ae339259 feat(50-03): implement blastSugarCrush pure sequence planner — FOUND
- 1c5c6d79 feat(50-03): implement useBlastSugarCrush orchestration hook — FOUND
- 0abd28be feat(50-03): wire Sugar Crush into BlastGame end-of-move flow — FOUND

## Self-Check: PASSED
