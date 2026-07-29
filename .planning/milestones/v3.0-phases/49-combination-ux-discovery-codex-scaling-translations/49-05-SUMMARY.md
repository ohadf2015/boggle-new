---
phase: 49-combination-ux-discovery-codex-scaling-translations
plan: "05"
subsystem: blast-combo-discovery
tags: [blast, combo-discovery, wiring, integration]
dependency_graph:
  requires: [49-01]
  provides: [COMB-04]
  affects: [BlastView, BlastGame, BlastGameLayout, useBlastGame]
tech_stack:
  added: []
  patterns: [ref-pattern-stable-callbacks, prop-drilling-discovery-state]
key_files:
  created:
    - fe-next/components/blast/__tests__/BlastGame.discovery.test.tsx
    - fe-next/components/blast/__tests__/BlastView.discovery.test.tsx
  modified:
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/BlastGame.tsx
    - fe-next/components/blast/BlastGameLayout.tsx
    - fe-next/components/blast/BlastView.tsx
decisions:
  - "onComboDetected uses same ref pattern as onSynergyDetected to avoid stale closures in clearTilesForWord callback"
  - "isDiscoveryActive derived from pendingDiscovery != null in BlastGame, not passed separately"
  - "acknowledgeDiscovery defaults to no-op fn when undefined so BlastComboDiscovery always has a valid onComplete"
metrics:
  duration: ~15min
  completed: "2026-03-04"
  tasks: 2
  files: 6
---

# Phase 49 Plan 05: Wire BlastComboDiscovery into Gameplay Summary

Complete integration of the BlastComboDiscovery banner into the live gameplay path — wiring hook output through BlastView → BlastGame → BlastComboDiscovery + input blocking via BlastGameLayout.

## What Was Built

Gap closure for COMB-04: the combo discovery banner existed (49-01) but was never rendered and onComboDetected was never called. This plan completed the 4-file wiring.

## Task Execution

### Task 1: Add onComboDetected to useBlastGame + wire BlastGame + BlastGameLayout

**useBlastGame.ts (3 changes):**
- Added `SpecialCombo` to import from `'../utils/blastCombos'` (merged with existing import to fix duplicate-import lint)
- Added `onComboDetected?: (combos: SpecialCombo[]) => void` to `UseBlastGameOptions`
- Added `onComboDetectedRef` using same ref pattern as `onSynergyDetectedRef`
- Fires `onComboDetectedRef.current?.(detectedCombos)` after `onSynergyDetectedRef` call

**BlastGame.tsx:**
- Added `onComboDetected`, `pendingDiscovery`, `acknowledgeDiscovery` props to `BlastGameProps`
- Passes `onComboDetected` to `useBlastGame` options via `useCallback`
- Renders `<BlastComboDiscovery pendingDiscovery={pendingDiscovery ?? null} onComplete={acknowledgeDiscovery ?? (() => {})} />`
- Computes `isDiscoveryActive = pendingDiscovery != null` and passes to `BlastGameLayout`
- Fixed pre-existing duplicate import lint error (`blastWaveConfig`)

**BlastGameLayout.tsx:**
- Added `isDiscoveryActive?: boolean` prop (defaults to `false`)
- Changed `BlastGrid interactive={!isComplete}` to `interactive={!isComplete && !isDiscoveryActive}`

**Test:** `BlastGame.discovery.test.tsx` — 8 tests covering prop flow and isDiscoveryActive propagation

### Task 2: Wire BlastView to pass discovery state to BlastGame

**BlastView.tsx (2 changes):**
- Changed `const { discoveredCombos } = useBlastComboDiscovery()` to destructure all 4 return values
- Added `onComboDetected`, `pendingDiscovery`, `acknowledgeDiscovery` to `<BlastGame>` JSX

**Test:** `BlastView.discovery.test.tsx` — 4 tests verifying all 3 props reach BlastGame

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate import in useBlastGame.ts**
- Found during: Task 1 (lint check)
- Issue: Adding `SpecialCombo` as separate `import type` created duplicate import from `'../utils/blastCombos'`
- Fix: Merged into single import `{ detectSpecialCombos, type BlastComboType, type SpecialCombo }`
- Files modified: `fe-next/components/blast/hooks/useBlastGame.ts`

**2. [Rule 1 - Bug] Fixed pre-existing duplicate import in BlastGame.tsx**
- Found during: Task 1 (lint check)
- Issue: `WaveConfig` and `getWaveObjectives` were two separate imports from `'./utils/blastWaveConfig'`
- Fix: Merged into single import `{ getWaveObjectives, type WaveConfig }`
- Files modified: `fe-next/components/blast/BlastGame.tsx`

## Verification

- Blast test suite: 880 tests passed, 66 suites, 0 regressions
- Lint: No errors in modified files
- New tests: 12 total (8 + 4), all green

## Self-Check: PASSED

Files created/modified:
- FOUND: fe-next/components/blast/__tests__/BlastGame.discovery.test.tsx
- FOUND: fe-next/components/blast/__tests__/BlastView.discovery.test.tsx
- FOUND: fe-next/components/blast/hooks/useBlastGame.ts
- FOUND: fe-next/components/blast/BlastGame.tsx
- FOUND: fe-next/components/blast/BlastGameLayout.tsx
- FOUND: fe-next/components/blast/BlastView.tsx

Commits:
- FOUND: d81b4187 (Task 1)
- FOUND: 6866738c (Task 2)
