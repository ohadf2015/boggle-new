---
phase: 48-combination-system-core
plan: "04"
subsystem: blast-combo-visual-audio
tags: [blast, combo, animation, audio, visual-feedback]
dependency_graph:
  requires: [48-02, 48-03]
  provides: [BlastComboFlash, activeComboFlash, clearComboFlash, onSynergyDetected]
  affects: [BlastGame, useBlastGame, BlastGameLayout]
tech_stack:
  added: []
  patterns: [framer-motion AnimatePresence, useReducedMotion, AdaptiveMotion pattern, tier classification sets]
key_files:
  created:
    - fe-next/components/blast/BlastComboFlash.tsx
    - fe-next/components/blast/__tests__/BlastComboFlash.test.tsx
    - fe-next/components/blast/hooks/__tests__/useBlastComboFlash.test.ts
  modified:
    - fe-next/components/blast/hooks/useBlastGame.ts
    - fe-next/components/blast/BlastGame.tsx
decisions:
  - "Tier 3 = prism_prism/prism_rainbow/lightning_prism (multiplier >= 6); Tier 2 = all pairs with multiplier 4-5 plus rainbow_mirror=5; Tier 1 = bomb_bomb/bomb_frozen/lightning_frozen/rainbow_frozen + gold_special/rainbow_special/triple_special"
  - "onSynergyDetected fires for FIRST combo only (highest priority) per word submission — not per combo in list"
  - "useReducedMotion: skip flash entirely (instant onComplete) for accessibility users"
  - "BlastComboFlash wrapped in relative div in BlastGame — overlays the entire game root at z-40"
metrics:
  duration: ~7min
  completed_date: "2026-03-04"
  tasks: 2
  files: 5
---

# Phase 48 Plan 04: Combo Visual and Audio Feedback Summary

Tier-based full-screen flash overlay and audio sting callback for the 28-pair combination system.

## What Was Built

**BlastComboFlash component** (`BlastComboFlash.tsx`) — full-screen overlay that fires when any special combination is detected:
- Tier 1 (moderate, scoreMultiplier 3): cyan flash `#00FFFF` — bomb_bomb, bomb_frozen, lightning_frozen, rainbow_frozen, gold_special, rainbow_special, triple_special
- Tier 2 (powerful, scoreMultiplier 4-5): orange flash `#FF6B35` — 24 pairs including bomb_lightning, bomb_prism, prism_mirror, etc.
- Tier 3 (ultimate, scoreMultiplier 6-10): rainbow gradient — prism_prism (10x), prism_rainbow (7x), lightning_prism (6x)
- Auto-dismisses after 400ms via `onAnimationComplete` → `onComplete(id)`
- Respects `useReducedMotion()`: instant dismiss with no visible flash
- `absolute inset-0 pointer-events-none z-40`

**useBlastGame wiring**:
- New `activeComboFlash: { id: string; comboType: BlastComboType } | null` state
- New `clearComboFlash()` callback exported from hook
- New `onSynergyDetected?: (comboType: BlastComboType) => void` in `UseBlastGameOptions`
- Flash set with `setActiveComboFlash({ id: 'combo-flash-${now}', comboType: detectedCombos[0].type })` after combo execution
- `onSynergyDetectedRef.current?.(detectedCombos[0].type)` for stale-closure-safe callback

**BlastGame integration**:
- Passes `onSynergyDetected: (_comboType) => playComboSound(3)` for max-intensity audio sting
- Renders `<BlastComboFlash activeFlash={blast.activeComboFlash} onComplete={blast.clearComboFlash} />` in game root wrapper

## Tests

| File | Tests |
|------|-------|
| BlastComboFlash.test.tsx | 24 (getComboTier x12, getComboFlashColor x3, component render x9) |
| useBlastComboFlash.test.ts | 7 (state contract x4, callback contract x3) |
| **Total new** | **31** |
| Full blast suite | 830 pass |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] BlastComboFlash.tsx exists and exports getComboTier, getComboFlashColor, BlastComboFlash
- [x] BlastComboFlash.test.tsx created with 24 green tests
- [x] useBlastComboFlash.test.ts created with 7 green tests
- [x] useBlastGame.ts exports activeComboFlash and clearComboFlash
- [x] BlastGame.tsx renders BlastComboFlash
- [x] All 830 blast tests green
- [x] Commits: 03d90e6c (Task 1), 4c65f5bb (Task 2)

## Self-Check: PASSED
