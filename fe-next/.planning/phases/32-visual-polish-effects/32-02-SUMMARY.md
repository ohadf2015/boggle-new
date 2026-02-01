---
phase: 32-visual-polish-effects
plan: 02
subsystem: celebration-particles
tags: [confetti, fireworks, combo-milestones, particle-budgets, accessibility]

dependencies:
  requires:
    - 26-01: useParticleBudget hook
    - 26-02: usePrefersReducedMotion hook
    - celebration/NewYearFireworks component
  provides:
    - BossDefeatFireworks: Tier-scaled fireworks (mini/standard/elite)
    - useComboMilestone: Combo threshold tracking (10/15/20)
    - fireLayeredCelebration: 3-layer depth celebration
  affects:
    - 32-03: ComboMilestoneOverlay (will use useComboMilestone hook)
    - 32-05: AdventureGame integration (will wire boss defeat fireworks)

tech-stack:
  added: []
  patterns:
    - Layered particle effects (background/mid/foreground)
    - Budget-aware celebrations (60%/80%/100% scaling)
    - Z-index hierarchy (1000/2000/3000 for depth)

key-files:
  created:
    - components/celebration/BossDefeatFireworks.tsx
    - components/celebration/__tests__/BossDefeatFireworks.test.tsx
    - hooks/useComboMilestone.ts
    - hooks/__tests__/useComboMilestone.test.ts
  modified:
    - utils/confettiUtils.ts (added fireLayeredCelebration)

decisions:
  - title: Boss tier fireworks intensity
    rationale: Mini (6/3s), Standard (10/5s), Elite (15/8s) scales celebration with challenge
    alternatives: [Fixed intensity, Linear scaling]
    chosen: Tier-based discrete scaling
    impact: Clearer differentiation between boss types

  - title: Combo milestone thresholds
    rationale: 10/15/20 provides achievable milestones with increasing rarity
    alternatives: [5/10/15, 10/20/30, Dynamic based on level]
    chosen: 10/15/20 fixed thresholds
    impact: Consistent goals across all levels

  - title: Particle budget scaling
    rationale: 60%/80%/100% prevents budget exhaustion while maintaining impact
    alternatives: [100% always, Linear 33%/66%/100%, Exponential]
    chosen: 60%/80%/100% discrete steps
    impact: Budget safety margin preserved

metrics:
  duration: 477s (~8 minutes)
  completed: 2026-02-01
---

# Phase 32 Plan 02: Boss Defeat Fireworks & Combo Milestones Summary

> Epic boss defeat celebrations and 10+ combo full-screen effects

## One-liner

Boss defeat fireworks scale with tier (6/10/15 bursts), combo milestones trigger at 10/15/20 with layered 3-depth particles respecting budget limits

## What was built

### BossDefeatFireworks Component
Wrapper around NewYearFireworks adapted for boss defeat context:
- **Mini bosses**: 6 bursts over 3 seconds (light celebration)
- **Standard bosses**: 10 bursts over 5 seconds (medium celebration)
- **Elite bosses**: 15 bursts over 8 seconds (epic celebration)
- Exported `BOSS_TIER_CONFIG` constant for tier configurations
- 6 comprehensive tests covering all tiers and edge cases

### useComboMilestone Hook
Combo threshold tracking with automatic celebrations:
- **10 combo**: "INCREDIBLE!" - 2s duration, 60% particle budget
- **15 combo**: "UNSTOPPABLE!" - 2.5s duration, 80% particle budget
- **20 combo**: "LEGENDARY!" - 3s duration, 100% particle budget
- Prevents duplicate triggers for same milestone
- Auto-clears milestone after duration expires
- Respects reduced motion preference (no particles if enabled)
- 10 comprehensive tests covering all thresholds and behaviors

### fireLayeredCelebration Utility
3-layer depth particle system added to confettiUtils.ts:
- **Background layer** (20% budget): Large slow particles at z-index 1000
- **Midground layer** (60% budget): Main celebration at z-index 2000 (100ms delay)
- **Foreground layer** (20% budget): Fast sparkles at z-index 3000 (200ms delay)
- Uses 80% of provided combo budget for safety margin
- Neo-brutalist styling (flat squares, bold colors)

## Key technical decisions

**1. Tier-based discrete scaling (boss fireworks)**
- Why: Clear differentiation between boss types, predictable celebration
- Alternative considered: Linear scaling based on boss level
- Impact: Players recognize tier by celebration intensity

**2. Fixed milestone thresholds (10/15/20)**
- Why: Achievable goals with increasing rarity, consistent across levels
- Alternative considered: Dynamic thresholds based on level difficulty
- Impact: Players develop muscle memory for milestone triggers

**3. Particle budget multipliers (60%/80%/100%)**
- Why: Scales impact while preserving budget safety margin
- Alternative considered: Always 100% budget usage
- Impact: Prevents budget exhaustion on rapid milestone triggers

## Testing coverage

- **BossDefeatFireworks**: 6 tests (tier configs, render states)
- **useComboMilestone**: 10 tests (thresholds, celebrations, reduced motion, budget scaling)
- **Total**: 16 tests, all passing

## Integration points

**Inputs (dependencies)**:
- `useParticleBudget()` - Device-aware particle limits (30/60/100)
- `usePrefersReducedMotion()` - Accessibility preference
- `NewYearFireworks` - Base fireworks component
- `Z_INDEX` constants - Layering hierarchy

**Outputs (provided)**:
- `BossDefeatFireworks` component for boss battles
- `useComboMilestone` hook for combo tracking
- `fireLayeredCelebration` utility for 3-layer effects

**Wiring needed (future plans)**:
- 32-03: ComboMilestoneOverlay will display `currentMilestone.labelKey`
- 32-05: AdventureGame will trigger `<BossDefeatFireworks>` on boss defeat

## Performance characteristics

**Particle budget enforcement**:
- Uses 80% of combo budget (safety margin)
- Splits across 3 layers (20%/60%/20%)
- Respects device limits (30/60/100 max)
- Example: High-tier device (60 combo budget) at 20-combo milestone:
  - Total: 60 * 1.0 * 0.8 = 48 particles
  - Background: 9 particles, Midground: 28 particles, Foreground: 9 particles

**Timing**:
- Milestone celebrations: 2-3s duration
- Layered delays: 0ms/100ms/200ms for depth perception
- Boss fireworks: 3-8s duration based on tier

## Deviations from plan

None - plan executed exactly as written.

## Next phase readiness

**Ready for 32-03 (Combo Milestone Overlay)**:
- ✅ `useComboMilestone` hook ready for consumption
- ✅ Translation keys defined (`adventure.combo.incredible/unstoppable/legendary`)
- ✅ Milestone data structure includes `labelKey` and `duration`

**Ready for 32-05 (AdventureGame Integration)**:
- ✅ `BossDefeatFireworks` component ready for wiring
- ✅ `BOSS_TIER_CONFIG` exported for external use
- ✅ Particle budget integration complete

**Blockers**: None

**Concerns**: None

## Files changed

**Created (4 files)**:
- `components/celebration/BossDefeatFireworks.tsx` (75 lines)
- `components/celebration/__tests__/BossDefeatFireworks.test.tsx` (58 lines)
- `hooks/useComboMilestone.ts` (125 lines)
- `hooks/__tests__/useComboMilestone.test.ts` (175 lines)

**Modified (1 file)**:
- `utils/confettiUtils.ts` (+87 lines, added fireLayeredCelebration)

**Total**: 520 lines added

## Commit history

1. `9df73f97` - feat(32-02): implement BossDefeatFireworks component
   - BossDefeatFireworks wrapper with tier scaling
   - 6 comprehensive tests

2. `9cef64a2` - feat(32-02): implement useComboMilestone hook and layered celebrations
   - useComboMilestone with 10/15/20 thresholds
   - fireLayeredCelebration 3-layer system
   - 10 comprehensive tests
