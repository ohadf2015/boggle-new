---
phase: 49-combination-ux-discovery-codex-scaling-translations
plan: "02"
subsystem: blast-codex-modal
tags: [blast, combo, codex, modal, tdd, translations]
dependency_graph:
  requires: [49-01-useBlastComboDiscovery, 49-03-CODEX_COMBOS]
  provides: [BlastCodexModal, codex-button-on-ready-screen]
  affects: [BlastReadyScreen, BlastView]
tech_stack:
  added: []
  patterns: [tdd-red-green, framer-motion-modal, optional-prop-backward-compat]
key_files:
  created:
    - fe-next/components/blast/BlastCodexModal.tsx
    - fe-next/components/blast/__tests__/BlastCodexModal.test.tsx
  modified:
    - fe-next/components/blast/BlastReadyScreen.tsx
    - fe-next/components/blast/BlastView.tsx
    - fe-next/translations/en.js
    - fe-next/translations/he.js
    - fe-next/translations/sv.js
    - fe-next/translations/ja.js
decisions:
  - BlastReadyScreen.discoveredCombos is optional (Set<BlastComboType> | undefined) — backward-compat; defaults to empty Set in modal
  - BlastView calls useBlastComboDiscovery() and passes discoveredCombos to BlastReadyScreen
  - 22 missing combo translation names added to all 4 languages (en/he/sv/ja) + comboCodex, codexProgress, codexLocked keys
metrics:
  duration_minutes: 4
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 6
---

# Phase 49 Plan 02: Combo Codex Modal Summary

**One-liner:** BlastCodexModal with 31-card discovered/undiscovered grid, progress counter, wired via Codex button on BlastReadyScreen, plus 22 missing combo translations in all 4 languages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create BlastCodexModal component (TDD) | e048badc | BlastCodexModal.tsx, BlastCodexModal.test.tsx, 4 translation files |
| 2 | Add Codex button to BlastReadyScreen + wire discoveredCombos | 21512ddf | BlastReadyScreen.tsx, BlastView.tsx |

## What Was Built

### BlastCodexModal Component
- Props: `{ discoveredCombos: Set<BlastComboType>; isOpen: boolean; onClose: () => void; }`
- Renders nothing when `isOpen` is false
- Fixed-position backdrop + neo-brutalist modal card (`data-testid="combo-codex-modal"`)
- Header: `t('blast.comboCodex')` title + `t('blast.codexProgress', { discovered, total })` counter
- Scrollable 2-column grid of 31 combo cards from `CODEX_COMBOS`
- Discovered cards: `bg-neo-yellow/20 border-neo-yellow/60` + translated combo name
- Undiscovered cards: `bg-gray-800/50 border-gray-600/40` + `t('blast.codexLocked')` = "???"
- Close button (`data-testid="codex-close-button"`) + backdrop click to dismiss

### BlastReadyScreen Updates
- Added `discoveredCombos?: Set<BlastComboType>` prop (optional, backward-compat)
- `isCodexOpen` state controls modal visibility
- "COMBO CODEX" secondary button with `BookOpen` icon below the main play button
- `BlastCodexModal` rendered at bottom of component

### BlastView Updates
- Calls `useBlastComboDiscovery()` to get `discoveredCombos` Set
- Passes `discoveredCombos` to `<BlastReadyScreen>`

### Translation Additions (all 4 languages)
Added 22 missing combo names + 3 codex keys:
- `blast.comboCodex`, `blast.codexProgress`, `blast.codexLocked`
- New combo pairs: bomb_rainbow, bomb_mirror, bomb_magnet, bomb_gem, bomb_frozen, lightning_rainbow, lightning_mirror, lightning_magnet, lightning_gem, lightning_frozen, prism_rainbow, prism_mirror, prism_magnet, prism_gem, prism_frozen, rainbow_mirror, rainbow_magnet, rainbow_gem, rainbow_frozen, mirror_magnet, mirror_gem, mirror_frozen, magnet_gem, magnet_frozen, gem_frozen

## Test Results

- `BlastCodexModal.test.tsx`: 7 tests green (TDD RED-GREEN cycle)
- `BlastReadyScreen.test.tsx`: 5 tests green (no regressions)
- Full blast suite: 868 tests, 64 suites — all green (1 pre-existing flaky parallel isolation issue in treasureGem unrelated to this plan)

## Deviations from Plan

**[Rule 2 - Missing critical content] Added 22 missing combo translation names**
- Found during: Task 1 (translation audit revealed only 9 of 31 combo names existed)
- Fix: Added all missing combo name translations to en/he/sv/ja before the modal could render properly
- Files: en.js, he.js, sv.js, ja.js
- Commit: e048badc

## Self-Check: PASSED

- fe-next/components/blast/BlastCodexModal.tsx: FOUND
- fe-next/components/blast/__tests__/BlastCodexModal.test.tsx: FOUND
- fe-next/components/blast/BlastReadyScreen.tsx: FOUND (modified)
- fe-next/components/blast/BlastView.tsx: FOUND (modified)
- Commit e048badc: FOUND
- Commit 21512ddf: FOUND
