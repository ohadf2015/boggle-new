---
phase: 30
plan: 03
subsystem: boss-battle
tags: [telegraph, warning, animation, framer-motion, accessibility]
dependency-graph:
  requires: ["30-01"]
  provides: ["attack-telegraph-system", "tile-warning-overlay"]
  affects: ["30-04", "30-05", "30-06"]
tech-stack:
  added: []
  patterns: ["countdown-hook", "progress-tracking", "reduced-motion"]
key-files:
  created:
    - hooks/useAttackTelegraph.ts
    - hooks/useAttackTelegraph.test.ts
    - components/adventure/boss/AttackTelegraph.tsx
    - components/adventure/boss/AttackTelegraph.test.tsx
    - components/adventure/boss/TileWarningOverlay.tsx
  modified:
    - components/adventure/boss/index.ts
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - id: countdown-interval
    choice: "50ms update interval"
    rationale: "20 FPS provides smooth animation without excessive re-renders"
  - id: progress-calculation
    choice: "Math.min(elapsed / duration, 1)"
    rationale: "Prevents progress from exceeding 100% and handles timing edge cases"
  - id: reduced-motion-fallback
    choice: "Static border indicator"
    rationale: "Provides clear visual warning without animation for motion-sensitive users"
metrics:
  duration: ~9 minutes
  completed: 2026-01-31
  tests-added: 45
  tests-passing: 45
---

# Phase 30 Plan 03: Attack Telegraph System Summary

Attack telegraph system with 2-second visual warning before boss attacks, including pulsing effects on targeted tiles.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create useAttackTelegraph hook | af4ce1a5 | hooks/useAttackTelegraph.ts, .test.ts |
| 2 | Create TileWarningOverlay component | fbbd490f | components/adventure/boss/TileWarningOverlay.tsx |
| 3-4 | Create AttackTelegraph + translations | 1a42fca1 | AttackTelegraph.tsx, .test.tsx, translations/*.js |

## Implementation Details

### useAttackTelegraph Hook

The core hook manages telegraph state and countdown.

**Key Features:**
- 2-second default duration (configurable)
- Progress tracking (0-1) updated every 50ms
- Time remaining in milliseconds
- Target tiles array for highlighting
- Ability ID for styling/theming
- onComplete callback when countdown finishes
- Cancel functionality with full state reset
- Cleanup on unmount

**API:**
```typescript
const { state, startTelegraph, cancelTelegraph, isActive, progress } = useAttackTelegraph({
  duration: 2000,
  onComplete: (abilityId, targetTiles) => executeBossAttack(abilityId, targetTiles),
});

startTelegraph('scramble', [0, 1, 2, 3]); // Start 2s countdown
```

### TileWarningOverlay Component

Visual overlay for targeted tiles with pulsing red glow.

**Effects (scale with progress):**
- Opacity: 30% -> 80%
- Scale: 100% -> 115%
- Glow: 10px -> 30px

**Reduced Motion:**
- Disables animations
- Shows static red border instead

### AttackTelegraph Component

Main warning UI rendered above the game.

**Elements:**
1. Warning banner with:
   - Warning icon (shaking)
   - "Incoming Attack!" text
   - Ability name (optional)
   - Countdown timer (2, 1, 0)
2. Progress bar (bottom of screen)
3. Screen edge flash effect

**Accessibility:**
- role="alert" with aria-live="assertive"
- Progress bar with aria-valuenow
- Countdown with aria-label

### Translations

Added to all 4 languages:
- `adventure.bosses.telegraph.incoming` - "Incoming Attack!"
- `adventure.bosses.telegraph.warning` - "Watch Out!"
- `adventure.bosses.telegraph.prepare` - "Prepare yourself!"
- `adventure.bosses.telegraph.progress` - "Attack charging"
- `common.seconds` - "seconds"

## Verification Checklist

- [x] useAttackTelegraph hook manages 2s countdown correctly (26 tests)
- [x] AttackTelegraph renders warning banner with countdown (19 tests)
- [x] TileWarningOverlay provides pulsing visual effect
- [x] All tests pass (45 tests)
- [x] Reduced motion is respected
- [x] Translations added to all 4 languages
- [x] npm run lint passes
- [x] npm run build succeeds

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| hooks/useAttackTelegraph.test.ts | 26 | Passing |
| components/adventure/boss/AttackTelegraph.test.tsx | 19 | Passing |
| **Total** | **45** | **Passing** |

## Integration Notes

The attack telegraph components are exported from `components/adventure/boss/index.ts`:

```typescript
import { AttackTelegraph, TileWarningOverlay } from '@/components/adventure/boss';
import { useAttackTelegraph } from '@/hooks/useAttackTelegraph';
```

Integration with the game board will be handled in Plan 30-04 (Boss Ability System).

## Next Phase Readiness

**Ready for 30-04:** Attack telegraph system is complete and exported. The next plan can integrate:
- Wire telegraph to boss ability execution
- Apply TileWarningOverlay to game board tiles
- Trigger startTelegraph when boss prepares an attack

**Dependencies Satisfied:**
- useAttackTelegraph hook for state management
- AttackTelegraph component for UI
- TileWarningOverlay for tile highlighting
- Translations for all supported languages
