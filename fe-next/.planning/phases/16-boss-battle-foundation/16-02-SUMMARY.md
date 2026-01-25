---
phase: 16-boss-battle-foundation
plan: 02
subsystem: ui-components
tags: [boss-battles, health-bar, neo-brutalism, accessibility, i18n]
requires:
  - 16-01
provides:
  - Boss HP bar UI component
  - Real-time HP display
  - Enraged phase indicator
  - Boss battle visual feedback
affects:
  - 16-03
  - 16-04
  - 16-05
tech-stack:
  added:
    - framer-motion (animations)
  patterns:
    - Component visibility based on game phase
    - Spring physics for smooth HP transitions
    - Conditional styling based on boss state
key-files:
  created:
    - components/adventure/BossHPBar.tsx
    - components/adventure/__tests__/BossHPBar.test.tsx
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
    - translations/es.js
decisions:
  - name: Spring physics for HP animation
    rationale: Smooth, natural-feeling HP depletion enhances battle feedback
    alternatives: Linear transitions, instant updates
    tradeoffs: Slightly more complex but significantly better UX
  - name: Green → Red color transition
    rationale: Universal color language (healthy → danger)
    alternatives: Themed colors per boss
    tradeoffs: Consistency over variety, better accessibility
  - name: Hide during intro/victory/defeat
    rationale: HP bar only relevant during active battle phases
    alternatives: Always show, fade out
    tradeoffs: Cleaner UI, reduced visual clutter
metrics:
  duration: 11 minutes
  completed: 2026-01-25
---

# Phase 16 Plan 02: Boss HP Bar UI Summary

Boss HP bar component with real-time updates and phase indicators (enraged state)

## What Was Built

### BossHPBar Component
Created a neo-brutalist HP bar component that:
- Displays boss health during active battles (hidden in intro/victory/defeat)
- Animates HP changes with spring physics (smooth, natural depletion)
- Transitions from green (active) to red (enraged at ≤25% HP)
- Shows "ENRAGED!" badge when boss enters enraged phase
- Fully accessible (ARIA roles, labels, live regions)
- Internationalized (5 languages: en, he, sv, ja, es)

### Translation Keys
Added `adventure.bosses.enraged` across all languages:
- **English**: "ENRAGED!"
- **Hebrew**: "זועם!" (zo'em)
- **Swedish**: "RASANDE!"
- **Japanese**: "激怒!" (gekido)
- **Spanish**: "¡ENFURECIDO!"

### Test Coverage
18 comprehensive tests covering:
- Phase-based visibility (intro, active, enraged, victory, defeat)
- HP display accuracy (current/max values, edge cases)
- Enraged indicator logic (only when phase === 'enraged')
- Boss name rendering from translation keys
- Accessibility features (role, aria-label, aria-live, aria-hidden)

## Technical Implementation

### Component Architecture
```typescript
interface BossHPBarProps {
  healthState: BossHealthState;  // From useBossHealth hook (16-01)
  bossName: string;               // Translation key
}
```

**Visibility Logic:**
- Only renders when `healthState.isActive === true`
- Active phases: 'active', 'enraged'
- Hidden phases: 'intro', 'victory', 'defeat'

**HP Bar Animation:**
- Framer Motion's `motion.div` with spring physics
- Stiffness: 200, Damping: 20 (smooth, natural feel)
- Width animates from 100% → calculated percentage
- Color transitions: `bg-lime-500` (active) → `bg-neo-red` (enraged)

**Enraged Indicator:**
- Badge appears when `phase === 'enraged'`
- Spring animation on mount (scale 0 → 1, rotate -15deg → 0deg)
- Neo-brutalist styling: border-3, shadow-hard-sm, rounded-neo

### Neo-Brutalist Design System
Applied LexiClash design standards:
- **Borders**: `border-3 border-neo-black` (chunky, solid)
- **Shadows**: `shadow-hard` (4px 4px 0px, no blur)
- **Borders Radius**: `rounded-neo` (4px, minimal rounding)
- **Colors**: Semantic color classes (neo-red, lime-500, neo-navy-light)
- **Typography**: `font-neo-display` (Fredoka bold)

### Accessibility Features
1. **Semantic HTML**: `role="status"` for screen readers
2. **Live Regions**: `aria-live="polite"` for HP updates
3. **Descriptive Labels**: `aria-label` includes boss name + HP percentage
4. **Visual Separation**: HP bar marked `aria-hidden="true"` (redundant with aria-label)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

**All 18 tests passing:**
```
✓ Visibility based on phase (5 tests)
✓ HP display (4 tests)
✓ Enraged indicator (3 tests)
✓ Boss name display (2 tests)
✓ Accessibility (4 tests)
```

**Test execution time:** 0.908s

## Validation

✅ TypeScript compiles: `npx tsc --noEmit` passes
✅ All tests pass: `npm run test:frontend -- BossHPBar` (18/18)
✅ Lint passes: `npm run lint` (no errors)
✅ Build succeeds: `npm run build` (compiled successfully)
✅ Translations complete: All 5 languages (en, he, sv, ja, es)

## Integration Points

### Consumes (from Phase 16-01)
- `BossHealthState` type from `types/boss.ts`
- `BossPhase` type from `types/boss.ts`
- Expected to receive `healthState` from `useBossHealth()` hook

### Provides (for Phase 16-03+)
- Visual HP feedback during boss battles
- Clear phase indicators (normal vs. enraged)
- Accessible battle status for all users

### Usage Example
```tsx
import BossHPBar from '@/components/adventure/BossHPBar';
import { useBossHealth } from '@/hooks/useBossHealth';

function BossBattle() {
  const { healthState } = useBossHealth(1000); // 1000 max HP

  return (
    <div>
      <BossHPBar
        healthState={healthState}
        bossName="adventure.bosses.msGrammar.name"
      />
      {/* Rest of battle UI */}
    </div>
  );
}
```

## Next Phase Readiness

**Ready for 16-03 (Boss Mechanics):**
- HP bar will display feedback from boss mechanic damage
- Enraged state visual will complement intensified mechanics
- Component tested and stable

**Potential Enhancements (Future):**
- Boss-specific HP bar colors (beyond green/red)
- HP bar pulse/shake on damage
- Boss portrait next to HP bar

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| ef8347cc | feat | Create BossHPBar component with translations |
| 3c9e3c9a | test | Add comprehensive tests for BossHPBar component |

**Files changed:** 6 files, 300 insertions(+)

---

**Duration:** 11 minutes
**Tests added:** 18
**Status:** ✅ Complete
