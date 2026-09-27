---
phase: 52-multiplayer-sync-new-mechanics-in-multiplayer
plan: 01
subsystem: blast-multiplayer
tags: [blast, multiplayer, tile-types, wave-distribution, tdd]
dependency_graph:
  requires: []
  provides: [canonical-blast-tile-types-in-mp, wave-aware-overlay-generation]
  affects: [blastModeManager, blastMultiplayerConstants]
tech_stack:
  added: []
  patterns: [wave-gated tile distribution via rollSpecialType + getWaveDistribution]
key_files:
  created: []
  modified:
    - fe-next/shared/constants/blastMultiplayerConstants.ts
    - fe-next/backend/modules/blastModeManager.ts
    - fe-next/backend/modules/__tests__/blastModeManager.test.ts
decisions:
  - BLAST_TILE_TYPES now references BLAST_TILE_TYPE_LIST directly (no hardcoded subset)
  - generateBlastOverlay delegates to rollSpecialType+getWaveDistribution, not uniform random
  - wave parameter defaults to 1 for backward compat; no callers need updates yet
  - BlastMPTileType alias kept for backward compat, now equivalent to BlastTileType
metrics:
  duration_min: 6
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_modified: 3
---

# Phase 52 Plan 01: Wire canonical tile types + wave-aware overlay into multiplayer blast

**One-liner:** Replaced stale 8-type hardcoded BLAST_TILE_TYPES subset with canonical 14-type list and made generateBlastOverlay wave-aware via rollSpecialType+getWaveDistribution.

## What Was Built

### Task 1: Update BLAST_TILE_TYPES to canonical list (TDD RED + GREEN)

**Problem:** `blastMultiplayerConstants.ts` had a hardcoded 8-type list (`['standard','gold','rainbow','bomb','ice','gem','lightning','magnet']`) that excluded mirror, silver, diamond, prism, frozen, and vortex. Multiplayer players never saw these tiles.

**Fix:** Replaced the hardcoded array with `BLAST_TILE_TYPE_LIST` imported from `@/shared/types/blast` (the canonical source). `BlastMPTileType` is now a simple alias for `BlastTileType`.

### Task 2: Make generateBlastOverlay wave-aware (TDD GREEN)

**Problem:** `generateBlastOverlay` picked uniformly from `BLAST_TILE_TYPES.filter(t => t !== 'standard')`, ignoring wave progression. Diamond tiles could appear in wave 1 matches.

**Fix:** Refactored to call `rollSpecialType(specialChance, getWaveDistribution(getWaveConfig(wave)))` per cell. Wave config controls which tiles unlock at each wave (diamond wave 4+, mirror wave 3+, etc.). Added optional `wave` param (defaults to 1) to both `generateBlastOverlay` and `initBlastModeState`.

## Tests Written

37 tests total (29 pre-existing + 8 new):

**New — canonical tile types:**
- `BLAST_TILE_TYPES should include all 14 canonical types`
- `BLAST_TILE_TYPES should include previously missing types (mirror, silver, diamond, prism)`
- `statistical: running 100 overlays produces new tile types`

**New — wave-aware:**
- `wave 1 overlay should NOT contain diamond tiles`
- `wave 4 overlay CAN contain diamond tiles`
- `wave 3 overlay CAN contain mirror tiles`
- `wave 1 overlay should NOT contain mirror tiles`
- `initBlastModeState accepts optional wave parameter`

## Deviations from Plan

### Auto-adapted — plan 52-03 pre-landed changes

Plan 52-03 (seeded PRNG) had already been applied to `blastModeManager.ts` before this plan ran, adding a `seed` field to `BlastModeState` and `initBlastModeState`. Our changes were layered on top cleanly — the `wave` parameter was added without disrupting the `seed` logic.

**Files modified beyond plan scope:** None. The seed feature was pre-existing.

## Self-Check

- [x] `fe-next/shared/constants/blastMultiplayerConstants.ts` uses `BLAST_TILE_TYPE_LIST`
- [x] `fe-next/backend/modules/blastModeManager.ts` uses `rollSpecialType + getWaveDistribution`
- [x] `fe-next/backend/modules/__tests__/blastModeManager.test.ts` has 37 passing tests
- [x] Commits `1420abfd` (tests) and `9fd0ae77` (implementation) exist

## Self-Check: PASSED
