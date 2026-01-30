---
phase: 28
plan: 03
subsystem: power-ups-ui
tags: [ui, components, power-ups, cooldown, animation, accessibility]
requires: [26-06-adaptive-particles, 26-07-adventure-hud, 28-01-power-up-state]
provides: [PowerUpButton, PowerUpActivationEffect]
affects: [28-04-hud-integration, 28-05-activation-logic]
decisions:
  - Use pulse-subtle animation for active state (existing neo-brutalist class)
  - border-3 for neo-brutalist button styling (3px border)
  - 0.25s burst duration matches combo feedback timing
  - Color schemes: cyan/blue (freeze), yellow/gold (hint), purple/pink (multiplier)
  - Zero animation for reduced motion users (accessibility first)
tech-stack:
  added: []
  patterns: [side-effect-component, accessibility-first-animation]
key-files:
  created:
    - components/adventure/power-ups/PowerUpButton.tsx
    - components/adventure/power-ups/PowerUpActivationEffect.tsx
    - components/adventure/power-ups/__tests__/PowerUpButton.test.tsx
    - components/adventure/power-ups/__tests__/PowerUpActivationEffect.test.tsx
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
metrics:
  duration: 9 minutes
  completed: 2026-01-30
---

# Phase 28 Plan 03: Power-Up UI Components Summary

**One-liner:** Interactive power-up buttons with cooldown indicators and 0.25s burst activation effects

## What Was Built

### PowerUpButton Component
Individual power-up button with integrated cooldown display:
- **Neo-brutalist styling**: `bg-neo-purple`, `border-3`, `shadow-hard`
- **Three states**: ready (interactive), cooldown (disabled), active (pulsing)
- **Hover effects**: Elevated shadow on hover, pressed state on active
- **CooldownIndicator integration**: Radial progress display with icon
- **Accessibility**: Aria-labels with state and remaining time info
- **Cascade blocking**: Disabled prop for preventing activation during board cascades

### PowerUpActivationEffect Component
Side-effect component for 0.25s burst on activation:
- **Screen shake**: Intensity 4, duration 250ms via `useScreenShake`
- **Particle burst**: Type "combo", intensity 2 via `AdaptiveParticles`
- **Color schemes per power-up**:
  - **freezeTime**: Cyan/blue (#00FFFF, #0080FF)
  - **hint**: Yellow/gold (#FFE135, #FFD700)
  - **scoreMultiplier**: Purple/pink (#9B59B6, #FF1493)
- **Reduced motion**: Skips animation entirely, calls onComplete immediately
- **Zero visual output**: No particles for reduced motion users (WCAG 2.1 compliant)

### Translations
Added to all 4 languages (en, he, sv, ja):
- `adventure.powerUps.freezeTime` - "Freeze Time" / "הקפא זמן" / "Frys tid" / "タイム凍結"
- `adventure.powerUps.hint` - "Hint" / "רמז" / "Tips" / "ヒント"
- `adventure.powerUps.scoreMultiplier` - "2x Score" / "ניקוד כפול" / "2x Poang" / "2倍スコア"
- `adventure.powerUps.ready` - "Ready" / "מוכן" / "Redo" / "準備完了"
- `adventure.powerUps.cooldown` - "{{seconds}}s" / "{{seconds}} שניות" / "{{seconds}}s" / "{{seconds}}秒"

## Technical Implementation

### Component Architecture
```typescript
// PowerUpButton wraps CooldownIndicator
<button disabled={state !== 'ready' || disabled}>
  <CooldownIndicator
    icon={icon}
    totalDuration={totalCooldown}
    remainingTime={remainingCooldown}
    label={t(label)}
  />
</button>

// PowerUpActivationEffect is side-effect only
useEffect(() => {
  if (prefersReducedMotion) {
    onComplete?.();
    return;
  }
  shake(4, 250);
  setTimeout(onComplete, 250);
}, []);
```

### State-Based Styling
- **Ready state**: Full opacity, hover effects, cursor-pointer
- **Cooldown state**: 50% opacity, cursor-not-allowed, disabled
- **Active state**: `animate-pulse-subtle` (scale 1.02, shadow expansion)
- **Disabled prop**: Same as cooldown state (cascade blocking)

### Accessibility Features
1. **Reduced motion support**: Zero animation for users with motion sensitivity
2. **Aria-labels**: Include power-up name, state, and remaining time
3. **Button states**: Proper disabled state management
4. **Keyboard navigation**: Native button element ensures keyboard access

## Testing

### Test Coverage
- **PowerUpButton**: 17 tests passing
  - Rendering (icon, label, neo-brutalist styling)
  - Ready state interaction (onClick, hover, cursor)
  - Cooldown state (disabled, opacity, cursor-not-allowed)
  - Active state (pulsing animation)
  - Disabled prop (cascade blocking)
  - Accessibility (aria-labels with state info)
  - All power-up types (freezeTime, hint, scoreMultiplier)

- **PowerUpActivationEffect**: 11 tests passing
  - Animation with motion (shake, particles, onComplete timing)
  - Reduced motion (skips animation, no particles)
  - Color schemes (correct colors per power-up type)
  - Origin position (passes to particles)
  - Edge cases (missing onComplete)

**Total**: 28 tests passing, lint clean

### Verification
```bash
npm run test:frontend -- --testPathPattern="power-ups" --coverage
# 28/28 tests passing

npm run lint
# No issues

grep -l "freezeTime" translations/*.js | wc -l
# 4 languages confirmed
```

## Deviations from Plan

None - plan executed exactly as written.

### Implementation Notes
1. **Animation class discovery**: Plan specified `animate-neo-pulse`, but existing Tailwind config uses `animate-pulse-subtle` for neo-brutalist pulsing - updated to use existing class
2. **Border class**: Used `border-3` (3px) instead of generic `border-neo` to match exact Tailwind config
3. **Mock refinement**: Test mock for `usePrefersReducedMotion` required function wrapper to avoid initialization order issues

## Integration Points

### Dependencies Used
- **CooldownIndicator**: Radial progress display from Phase 26-07
- **AdaptiveParticles**: Particle system from Phase 26-06
- **useScreenShake**: Screen shake hook from Phase 26-03
- **usePrefersReducedMotion**: Accessibility hook from Phase 26-05
- **PowerUpType/PowerUpState**: Type definitions from Plan 28-01

### Ready for Integration
- **Plan 28-04**: HUD integration (use these components in AdventurePowerUpHUD)
- **Plan 28-05**: Activation logic (trigger PowerUpActivationEffect on activation)
- **Plan 28-06**: Balance tuning (component styling can adjust based on feedback)

## Next Phase Readiness

### Completed Deliverables
✅ PowerUpButton renders with cooldown indicator
✅ PowerUpButton respects ready/cooldown/active states
✅ PowerUpActivationEffect triggers 0.25s burst (shake + particles)
✅ Reduced motion users get zero animation (accessibility)
✅ Translations added to all 4 languages (en, he, sv, ja)
✅ All tests pass, lint clean
✅ Neo-brutalist styling consistent with existing HUD components

### No Blockers
All components are standalone and ready for integration in Plan 28-04.

### Recommended Next Steps
1. **Plan 28-04**: Integrate into AdventurePowerUpHUD layout
2. **Test integration**: Verify button states update correctly with live cooldown timers
3. **Playtesting**: Confirm burst effects feel satisfying without being overwhelming
4. **Accessibility QA**: Test with reduced motion enabled to ensure zero animation

---

**Plan Status**: ✅ COMPLETE
**Commits**: 2 (feat: PowerUpButton, feat: PowerUpActivationEffect)
**Tests**: 28 passing
**Translation Coverage**: 4/4 languages (en, he, sv, ja)
