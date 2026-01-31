---
phase: 30-boss-battle-overhaul
plan: 02
subsystem: boss-battle-ui
tags: [react, framer-motion, hp-bar, phase-indicator, neo-brutalist, accessibility]
dependency-graph:
  requires: [30-01]
  provides: [SegmentedHPBar, PhaseIndicator]
  affects: [30-04, 30-05]
tech-stack:
  added: []
  patterns: ["3-segment HP bar", "phase-based color coding", "motion-safe animations"]
key-files:
  created:
    - components/adventure/boss/SegmentedHPBar.tsx
    - components/adventure/boss/SegmentedHPBar.test.tsx
    - components/adventure/boss/PhaseIndicator.tsx
    - components/adventure/boss/PhaseIndicator.test.tsx
  modified:
    - components/adventure/boss/index.ts
decisions:
  - decision: "Use data attributes (data-segment, data-fill) for testability"
    rationale: "Allows reliable DOM queries without relying on text content"
    alternatives: ["Test IDs only", "CSS class queries"]
  - decision: "Segment 1 = red, Segment 2 = lime, Segment 3 = green for visual hierarchy"
    rationale: "Red for danger (enraged), lime for caution (phase 2), green for normal (phase 1)"
    alternatives: ["Single color with opacity", "Gradient fill"]
  - decision: "Use motion.div with spring animation for HP fill"
    rationale: "Spring animation provides natural feel for HP depletion"
    alternatives: ["CSS transitions only", "Linear animation"]
metrics:
  duration: 12m
  completed: 2026-01-31
---

# Phase 30 Plan 02: Segmented HP Bar and Phase Indicator Summary

3-segment HP bar and phase indicator badge components for boss battles with smooth animations and neo-brutalist styling.

## Objective Achieved

Created SegmentedHPBar component displaying boss health across 3 color-coded segments corresponding to phase thresholds (0-33% red/enraged, 33-66% lime/phase2, 66-100% green/phase1). Integrated PhaseIndicator badge showing current phase with appropriate styling and animations.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create PhaseIndicator component with tests | f63b3641 | PhaseIndicator.tsx, PhaseIndicator.test.tsx |
| 2 | Create SegmentedHPBar component with tests | f63b3641 | SegmentedHPBar.tsx, SegmentedHPBar.test.tsx |
| 3 | Add translations for phase indicators | (pre-existing) | translations/*.js (already added in 30-03) |

## Implementation Details

### SegmentedHPBar Component

```typescript
interface SegmentedHPBarProps {
  currentHP: number;
  maxHP: number;
  phase: 'phase1' | 'phase2' | 'enraged';
  bossName: string;
}
```

**Segment Configuration:**
- Segment 1 (0-33%): `bg-neo-red` - Enraged zone
- Segment 2 (33-66%): `bg-neo-lime` - Phase 2 zone
- Segment 3 (66-100%): `bg-lime-500` - Phase 1 zone

**Features:**
- Calculates fill percentage per segment based on HP
- Framer-motion spring animations for smooth depletion
- Dividers at 33% and 66% threshold marks
- HP text overlay (current / max)
- ARIA progressbar with valuemin/valuemax/valuenow

### PhaseIndicator Component

```typescript
interface PhaseIndicatorProps {
  phase: 'phase1' | 'phase2' | 'enraged';
}
```

**Phase Styling:**
- Phase 1: `bg-neo-cyan`, `text-neo-black`
- Phase 2: `bg-neo-lime`, `text-neo-black`
- Enraged: `bg-neo-red`, `text-neo-white`, `animate-neo-shake`

**Accessibility:**
- `role="status"` for screen readers
- `aria-label` with phase description
- `motion-reduce:animate-none` for reduced motion

## Test Coverage

51 tests covering:
- **PhaseIndicator (22 tests):**
  - Phase 1/2/Enraged rendering
  - Color classes per phase
  - Accessibility attributes
  - Font styling consistency
  - Reduced motion support

- **SegmentedHPBar (29 tests):**
  - 3-segment structure
  - Fill calculations at various HP levels
  - Segment color classes
  - Divider positioning
  - HP text display
  - Neo-brutalist styling
  - Phase indicator integration
  - Edge cases (0 HP, negative HP, overflow)

## Deviations from Plan

**Translations already existed:** Task 3 (add translations) was discovered to be already completed by a previous 30-03 plan execution. The `adventure.bosses.phases.phase1` and `adventure.bosses.phases.phase2` keys were already in all 4 language files.

## Key Decisions

1. **Data attributes for testing:** Used `data-segment`, `data-fill`, `data-fill-bar`, `data-divider` attributes for reliable DOM queries in tests

2. **Segment fill calculation:**
   - If HP% <= segment min threshold: fill = 0%
   - If HP% >= segment max threshold: fill = 100%
   - Otherwise: linear interpolation within segment range

3. **Animation strategy:** Spring animation with stiffness 200, damping 20 for natural HP depletion feel

## Files Changed

| File | Lines | Purpose |
|------|-------|---------|
| components/adventure/boss/SegmentedHPBar.tsx | 249 | 3-segment HP bar component |
| components/adventure/boss/SegmentedHPBar.test.tsx | 345 | 29 tests for HP bar |
| components/adventure/boss/PhaseIndicator.tsx | 98 | Phase badge component |
| components/adventure/boss/PhaseIndicator.test.tsx | 217 | 22 tests for phase indicator |
| components/adventure/boss/index.ts | +4 | Barrel exports |

## Verification

- [x] PhaseIndicator component renders correctly for all phases
- [x] SegmentedHPBar shows 3 segments with correct fill calculations
- [x] Animations work (and respect reduced motion)
- [x] All tests pass (51 tests)
- [x] Translations present in all 4 languages (pre-existing)
- [x] npm run lint passes
- [x] npm run build succeeds

## Next Phase Readiness

This plan provides the foundation for:
- **30-04**: Visual phase transition effects (can add entrance animations when phase changes)
- **30-05**: Boss ability cooldowns (HP bar can show ability timers)

No blockers identified.
