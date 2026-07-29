---
phase: 49-combination-ux-discovery-codex-scaling-translations
plan: "01"
subsystem: blast-combo-discovery
tags: [blast, combo, discovery, localStorage, animation, tdd]
dependency_graph:
  requires: []
  provides: [useBlastComboDiscovery, BlastComboDiscovery]
  affects: [BlastView, useBlastGame]
tech_stack:
  added: []
  patterns: [localStorage persistence with ref mirror, framer-motion overlay, useReducedMotion]
key_files:
  created:
    - fe-next/components/blast/hooks/useBlastComboDiscovery.ts
    - fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts
    - fe-next/components/blast/BlastComboDiscovery.tsx
    - fe-next/components/blast/__tests__/BlastComboDiscovery.test.tsx
  modified:
    - fe-next/translations/en.js
    - fe-next/translations/he.js
    - fe-next/translations/sv.js
    - fe-next/translations/ja.js
decisions:
  - localStorage key blast_discovered_combos stores JSON array of BlastComboType strings
  - discoveredCombosRef mirrors state Set to prevent stale closures in onComboDetected callback
  - Banner auto-dismisses at 1800ms normal / 300ms reduced-motion; parent blocks grid input via pendingDiscovery !== null
  - useReducedMotion from framer-motion controls dismiss timing and animation skipping
metrics:
  duration_minutes: 7
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_created: 4
  files_modified: 4
---

# Phase 49 Plan 01: Combo Discovery Callout System Summary

**One-liner:** First-time combo detection banner with localStorage persistence using discoveredCombosRef stale-closure pattern + framer-motion overlay auto-dismissing at 1800ms.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useBlastComboDiscovery hook with localStorage persistence | 50ba02e0 | hooks/useBlastComboDiscovery.ts, hooks/__tests__/useBlastComboDiscovery.test.ts |
| 2 | BlastComboDiscovery banner overlay component | 1d46e56e | BlastComboDiscovery.tsx, __tests__/BlastComboDiscovery.test.tsx, 4 translation files |

## What Was Built

### useBlastComboDiscovery Hook
- `discoveredCombos: Set<BlastComboType>` — initialized from localStorage on mount (SSR-safe try/catch)
- `discoveredCombosRef` — mirrors Set for stale-closure-safe reads in callbacks
- `pendingDiscovery: BlastComboType | null` — set to first undiscovered combo type detected
- `onComboDetected(combos: SpecialCombo[])` — iterates combos, sets pendingDiscovery on first new type, updates ref+state synchronously, persists to localStorage
- `acknowledgeDiscovery()` — clears pendingDiscovery

### BlastComboDiscovery Banner Component
- Renders nothing when `pendingDiscovery` is null
- Shows semi-transparent backdrop + neo-brutalist card with "COMBO DISCOVERED!" + combo name
- Auto-dismisses via `useEffect` + `setTimeout`: 1800ms normal, 300ms reduced-motion
- Timer clears on cleanup (no memory leaks)
- Uses `data-testid="combo-discovery-banner"` for test targeting
- Translations added: `blast.comboDiscovered` in EN/HE/SV/JA

## Test Coverage

- `useBlastComboDiscovery`: 9 tests (all pass)
  - new combo sets pendingDiscovery, already-discovered does not, acknowledgeDiscovery clears, localStorage persist/load, SSR-safe, multi-combo picks first undiscovered
- `BlastComboDiscovery`: 7 tests (all pass)
  - null renders nothing, testid present, translation keys rendered, 1800ms timeout, timer clears on null

## Deviations from Plan

None - plan executed exactly as written.

Note: 6 pre-existing test failures in `blastComboEffects.test.ts` (bomb_gem, bomb_frozen variants) were detected during blast test suite run. These failures are caused by uncommitted working-tree changes to `blastComboEffects.ts` and `blastComboEffectsTactical.ts` from a prior session (confirmed by stashing those files and seeing tests pass). Not caused by 49-01 changes. Logged to deferred-items.

## Self-Check: PASSED

- fe-next/components/blast/hooks/useBlastComboDiscovery.ts: FOUND
- fe-next/components/blast/BlastComboDiscovery.tsx: FOUND
- fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts: FOUND
- fe-next/components/blast/__tests__/BlastComboDiscovery.test.tsx: FOUND
- Commit 50ba02e0: FOUND
- Commit 1d46e56e: FOUND
