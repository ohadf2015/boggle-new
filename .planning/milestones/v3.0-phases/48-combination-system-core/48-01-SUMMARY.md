---
phase: 48-combination-system-core
plan: "01"
subsystem: blast-combo-detection
tags: [blast, combos, tdd, refactor, tile-pairs]
dependency_graph:
  requires: []
  provides: [28-pair-detection, blastComboEffects-executor]
  affects: [useBlastGame, blastCombos, plans-48-02-03]
tech_stack:
  added: []
  patterns: [pure-function-extraction, no-op-skeleton-for-future-plans]
key_files:
  created:
    - fe-next/components/blast/utils/blastComboEffects.ts
    - fe-next/components/blast/utils/__tests__/blastComboEffects.test.ts
  modified:
    - fe-next/components/blast/utils/blastCombos.ts
    - fe-next/components/blast/utils/__tests__/blastCombos.test.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
decisions:
  - "usedTileKeys Set suppresses generic rainbow_special when specific pair already claimed the tiles"
  - "PAIR_COMBOS ordered highest-multiplier first so existing tests remain valid"
  - "executeComboEffect returns empty ComboEffectResult for unknown types (no-op skeleton for 48-02/03)"
  - "prism_prism uses markCleared directly (not applyToTile) to match original total_destruction logic"
metrics:
  duration_seconds: 297
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_changed: 5
---

# Phase 48 Plan 01: 28-Pair Combo Detection + Effect Extractor Summary

28-pair BlastComboType union with priority suppression of generic fallbacks + extracted executeComboEffect pure function with 6 migrated combo cases.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand BlastComboType to 28 pairs + update detection | 7df59113 | blastCombos.ts, blastCombos.test.ts |
| 2 | Extract combo effect executor from useBlastGame | a27e3ed3 | blastComboEffects.ts, blastComboEffects.test.ts, useBlastGame.ts |

## What Was Built

**blastCombos.ts** — Extended from 6 to 31 entries in `BlastComboType` union (6 original + 22 new pairs + gold_special + rainbow_special + triple_special). `PAIR_COMBOS` array now has 31 entries with research-matrix multipliers. `EFFECT_TILES` expanded to include rainbow/mirror/gem/frozen. `usedTileKeys` Set prevents double-detection of generic `rainbow_special` when a specific pair (e.g. `bomb_rainbow`) claimed the same tile.

**blastComboEffects.ts** — New pure-function module. `ComboEffectContext` interface wraps the grid mutation helpers so tests can inject mocks. `ComboEffectResult` carries explosions, processedBombKeys, processedLightningKeys, bonusScore. Six original cases migrated exactly; unknown types return empty result (safe no-op for 48-02/03 implementation).

**useBlastGame.ts** — 70-line inline switch replaced with ~15-line `executeComboEffect` call. Import added. BUGF-03 guard loop preserved.

## Verification

```
Test Suites: 58 passed
Tests:       776 passed (blastCombos: 49, blastComboEffects: 11, rest unchanged)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing rainbow_special test to match new priority behavior**
- **Found during:** Task 1 GREEN phase
- **Issue:** Old test `'should detect rainbow_special when rainbow paired with bomb'` expected `rainbow_special` for bomb+rainbow. New priority logic produces `bomb_rainbow` instead (specific pair wins).
- **Fix:** Updated test description and assertions to verify `bomb_rainbow` is returned and `rainbow_special` is NOT returned for the same tile pair.
- **Files modified:** `blastCombos.test.ts`
- **Commit:** 7df59113

## Self-Check: PASSED

All created files verified present. Both task commits verified in git log.
