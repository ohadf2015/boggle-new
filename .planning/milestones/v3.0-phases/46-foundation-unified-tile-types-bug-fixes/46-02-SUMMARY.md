---
phase: 46-foundation-unified-tile-types-bug-fixes
plan: "02"
subsystem: blast-game-engine
tags: [bug-fix, chain-propagation, lightning, bomb, prism, tdd]
dependency_graph:
  requires: ["46-01"]
  provides: ["chain-propagation-correctness"]
  affects: ["blast-scoring", "blast-tile-effects", "blast-game-spectacle"]
tech_stack:
  added: []
  patterns: ["processedLightning Set (mirrors processedBombs pattern)", "BFS bomb queue shared across all triggers"]
key_files:
  created:
    - fe-next/components/blast/__tests__/useBlastGame.chainPropagation.test.ts
  modified:
    - fe-next/components/blast/hooks/useBlastGame.ts
decisions:
  - "Use processedLightning Set to prevent double-trigger when lightning tile is at prism row+column intersection"
  - "Award LIGHTNING_COLUMN_CLEAR_BONUS for tiles cleared by chain-triggered lightning (prism→lightning path)"
  - "Chain-triggered lightning follows same pattern as direct lightning: enqueues bombs it finds in column"
metrics:
  duration: "8 minutes"
  completed: "2026-03-04"
  tasks_completed: 2
  files_modified: 2
  tests_added: 9
---

# Phase 46 Plan 02: Chain Propagation Bug Fixes Summary

Fixed two silent chain propagation bugs so lightning↔bomb and prism↔lightning chain correctly, restoring the spectacle of cascading special tile effects.

## What Was Built

Two bug fixes in `useBlastGame.ts` `clearTilesForWord` switch statement:

**BUGF-01: Lightning → Bomb chain** (`case 'lightning'`)
- Previously: lightning swept through bomb tiles in its column, marked them cleared, but never enqueued them in `bombQueue`
- Fix: after `markCleared(target)`, checks `target.type === 'bomb'` and enqueues in `bombQueue` if not already processed
- Mirrors exactly what the `prism` case already did at lines 695-698, 710-712

**BUGF-02: Prism → Lightning chain** (`case 'prism'`)
- Previously: prism cross-clear swept through lightning tiles, marked them cleared, but never triggered their column-clear
- Fix: after `markCleared(target)`, checks `target.type === 'lightning'` and triggers full column-clear inline
- Added `processedLightning` Set to prevent double-trigger when a lightning tile is at the intersection of prism's row and column sweeps
- Chain-triggered lightning also enqueues any bombs it finds (so prism→lightning→bomb full cascade works)

## Tests Added

`fe-next/components/blast/__tests__/useBlastGame.chainPropagation.test.ts` — 9 tests:

| Test | Validates |
|------|-----------|
| Hook baseline: bomb chain detonation | Bomb→bomb chain still works (regression guard) |
| BUGF-01 documented: no bomb enqueue in buggy code | Documents what the bug does |
| BUGF-01 fix: enqueue causes chain-detonation | BUGF-01 fix logic correct |
| BUGF-01 fix: two bombs both enqueued | Multi-bomb case works |
| BUGF-02 documented: no lightning trigger from prism row-sweep | Documents what the bug does |
| BUGF-02 fix: prism row-sweep triggers lightning column | BUGF-02 fix via row path |
| BUGF-02 fix: prism column-sweep triggers lightning column | BUGF-02 fix via column path |
| BUGF-02 fix: processedLightning prevents double-trigger | Guard against double column-clear |
| Full chain: prism→lightning→bomb cascade | Complete 3-tier chain works |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files exist:
- `fe-next/components/blast/__tests__/useBlastGame.chainPropagation.test.ts` — created
- `fe-next/components/blast/hooks/useBlastGame.ts` — modified with both bug fixes

### Commits exist:
- `b261d83f` — test(46-02): add chain propagation regression tests
- `b6550c77` — fix(46-02): fix chain propagation for lightning→bomb and prism→lightning

### Test results: 608 blast tests pass, 0 regressions

## Self-Check: PASSED
