---
phase: 52-multiplayer-sync-new-mechanics-in-multiplayer
plan: 03
subsystem: blast-mode
tags: [seeded-rng, multiplayer, determinism, blast, cascade]
dependency_graph:
  requires: []
  provides: [seeded-prng-blast-refill, blastmodestate-seed, blast-cascade-rng-param]
  affects: [blastLetterGenerator, blastGravity, blastModeManager, useBlastCascade, useBlastGame, gameState-store]
tech_stack:
  added: [Mulberry32 PRNG algorithm]
  patterns: [optional rng parameter pattern, seeded-random factory, Zustand state for multiplayer seed]
key_files:
  created:
    - fe-next/components/blast/utils/__tests__/blastLetterGenerator.seeded.test.ts
    - fe-next/components/blast/__tests__/blastGravity.seeded.test.ts
  modified:
    - fe-next/components/blast/utils/blastLetterGenerator.ts
    - fe-next/components/blast/utils/blastGravity.ts
    - fe-next/shared/types/game.ts
    - fe-next/backend/modules/blastModeManager.ts
    - fe-next/backend/modules/__tests__/blastModeManager.test.ts
    - fe-next/hooks/gameState/store.ts
    - fe-next/hooks/gameState/index.ts
    - fe-next/player/hooks/socket/usePlayerGameEvents.ts
    - fe-next/components/blast/hooks/useBlastCascade.ts
    - fe-next/components/blast/hooks/useBlastGame.ts
decisions:
  - "rng param goes AFTER spawnModifier in rollSpecialType to avoid breaking existing callers"
  - "each cascade creates a fresh RNG from the same seed (not a stateful RNG that persists) — ensures cross-client determinism for the same cascade event"
  - "blastSeed stored in Zustand store alongside blastTileOverlay; useBlastGame auto-reads it"
  - "boards remain client-authoritative; seeded refill reduces divergence but does not guarantee lockstep"
metrics:
  duration: 14min
  completed_date: "2026-03-04"
  tasks: 2
  files_changed: 10
---

# Phase 52 Plan 03: Seeded PRNG for Multiplayer Blast Refill Summary

Mulberry32 seeded PRNG for deterministic cascade tile refills in multiplayer blast mode.

## What Was Built

**Task 1 — `createSeededRandom` + `rng` param on generation functions:**
- Added `createSeededRandom(seed: number): () => number` to `blastLetterGenerator.ts` using the Mulberry32 algorithm
- Added optional `rng: () => number = Math.random` param to `generateBlastLetter` (3rd param, after `vowelModifier`)
- Added optional `rng: () => number = Math.random` param to `rollSpecialType` (4th param, after `spawnModifier`)
- Both default to `Math.random` — zero behavior change for singleplayer
- 14 new determinism tests in `blastLetterGenerator.seeded.test.ts`

**Task 2 — Thread rng through cascade, seed in BlastModeState, wire client:**
- `computeGravityResult` accepts optional `rng?` param (8th) and passes to `generateBlastLetter` and `rollSpecialType`
- `BlastModeState` interface extended with `seed?: number`
- `initBlastModeState` generates seed via `(Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0 || 1`
- Zustand store: added `blastSeed: number | null`, `setBlastSeed`, `useBlastSeed` selector
- `usePlayerGameEvents`: extracts `blastSeed` from `startGame` payload, calls `setBlastSeed`
- `useBlastCascade`: accepts `blastSeed?` option; creates `createSeededRandom(blastSeed)` per cascade call
- `useBlastGame`: auto-reads `useBlastSeed()` from store; passes `effectiveBlastSeed` to `useBlastCascade`
- 4 new seeded gravity tests + 3 new backend seed tests

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| blastLetterGenerator (all) | 37 | PASS |
| blastGravity (all) | 33 | PASS |
| blastModeManager (backend) | 37 | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- fe-next/components/blast/utils/blastLetterGenerator.ts — FOUND
- fe-next/components/blast/utils/__tests__/blastLetterGenerator.seeded.test.ts — FOUND
- fe-next/components/blast/utils/blastGravity.ts — FOUND
- fe-next/shared/types/game.ts — FOUND
- fe-next/backend/modules/blastModeManager.ts — FOUND

Commits exist:
- 8713114c — FOUND (Task 1)
- 827c66fc — FOUND (Task 2)
