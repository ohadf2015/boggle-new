---
phase: 34-dynamic-difficulty-tuning
plan: 04
subsystem: game-state
tags: [zustand, ai-director, state-management, performance]
dependency-graph:
  requires:
    - 34-01 (types, constants, performance monitor)
    - 34-02 (flow state detector)
    - 34-03 (intensity controller)
  provides:
    - Zustand store for AI Director state management
    - Barrel exports for AI Director module
    - Selective subscription hooks
  affects:
    - 34-05 (integration with AdventureGame)
tech-stack:
  added: []
  patterns:
    - Zustand store pattern (vs React Context for high-frequency updates)
    - Selective subscriptions for performance
    - Factory pattern for internal state management
key-files:
  created:
    - lib/aiDirector/index.ts
    - lib/aiDirector/intensityController.ts
    - stores/aiDirectorStore.ts
    - stores/aiDirectorStore.test.ts
  modified:
    - jest.config.js
decisions:
  - id: zustand-over-context
    choice: "Use Zustand instead of React Context"
    reason: "InGameContext has 57 properties; adding high-frequency metrics (every word) would cause re-render cascade"
  - id: internal-state-pattern
    choice: "Module-level variables for performanceMonitor and intensityController"
    reason: "These instances need to persist across renders but shouldn't be in Zustand state (not serializable)"
  - id: boss-exclusion-location
    choice: "Check isBossBattle in both getAdjustments() and handleTransition()"
    reason: "Double protection ensures boss battles never receive adjustments regardless of call path"
metrics:
  duration: "7 minutes"
  completed: "2026-02-01"
---

# Phase 34 Plan 04: AI Director Zustand Store Summary

Zustand store integrating all AI Director components with boss battle exclusion and selective subscriptions.

## What Was Built

### 1. Barrel Exports (`lib/aiDirector/index.ts`)
- Centralized exports for the AI Director module
- Re-exports from performanceMonitor, flowStateDetector, intensityController
- Type re-exports for convenience imports
- Clean import paths: `import { createPerformanceMonitor, detectFlowState } from '@/lib/aiDirector'`

### 2. Intensity Controller (`lib/aiDirector/intensityController.ts`)
- Created as dependency for this plan (34-03 parallel)
- Gradual pacing adjustments (10% per transition, not sudden jumps)
- INTENSITY_LIMITS prevent over-adjustment:
  - hintEscalationRate: 0.5 - 2.0
  - powerUpSpawnBonus: 0 - 2
  - comboGracePeriod: 0 - 3 seconds
- No adjustments during flow/learning states (good states)

### 3. Zustand Store (`stores/aiDirectorStore.ts`)
- High-frequency state management without re-render cascade
- State slices:
  - metrics: PerformanceWindow (WPM, success rate, combo)
  - flowState: FlowState ('bored' | 'flow' | 'frustrated' | 'learning')
  - intensityAdjustments: IntensityAdjustment
  - session tracking: isActive, isBossBattle, wordCount
- Actions:
  - startSession(isBossBattle): Initialize AI Director
  - recordWord(valid, comboLevel): Update metrics per word
  - handleTransition(): Apply adjustments at natural break points
  - endSession(): Cleanup intervals
  - reset(): Full state reset

### 4. Selective Subscription Hooks
- `useFlowState()`: Only flow state (lightweight)
- `useIntensityAdjustments()`: Only adjustments
- `usePerformanceMetrics()`: Only metrics
- `useAIDirectorActive()`: Only active status

## Key Implementation Details

### Boss Battle Exclusion (DDA-05)
```typescript
getAdjustments: () => {
  const state = get();
  // DDA-05: Boss battles always return neutral adjustments
  if (state.isBossBattle) {
    return { ...DEFAULT_INTENSITY };
  }
  return state.intensityAdjustments;
}
```

### Why Zustand Over Context
InGameContext has 57 properties. Adding metrics that update every word (high-frequency) would cause:
1. Every component subscribed to context re-renders
2. Performance degradation during gameplay
3. Potential frame drops during word submission

Zustand solution:
1. Only components using specific selectors re-render
2. Metrics can update every word without cascade
3. Separates concerns (game state vs. difficulty state)

### Internal State Pattern
```typescript
// Module-level (not in Zustand state)
let performanceMonitor = createPerformanceMonitor();
let intensityController = createIntensityController();
let flowCheckInterval: ReturnType<typeof setInterval> | null = null;
```

Why: These instances manage their own internal state (sliding windows, EMAs) and aren't serializable. They persist across Zustand updates but reset on session start.

## Tests

23 tests covering:
- Initialization (default state, zero metrics)
- Session lifecycle (start, end, reset)
- Word recording (metrics update, inactive handling)
- Boss exclusion (DDA-05 compliance)
- Transition handling (regular vs boss)
- Selective subscriptions

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| lib/aiDirector/index.ts | Created | 48 |
| lib/aiDirector/intensityController.ts | Created | 120 |
| stores/aiDirectorStore.ts | Created | 232 |
| stores/aiDirectorStore.test.ts | Created | 257 |
| jest.config.js | Modified | +2 (stores pattern) |

## Commits

| Hash | Message |
|------|---------|
| fc313d1a | feat(34-04): add AI Director barrel exports and intensity controller |
| fd86091a | feat(34-04): add AI Director Zustand store with boss battle exclusion |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created intensityController.ts for barrel exports**
- **Found during:** Task 1
- **Issue:** Plan 34-03 (intensity controller) running in parallel, file didn't exist yet
- **Fix:** Created intensityController.ts following 34-03 specification
- **Files modified:** lib/aiDirector/intensityController.ts
- **Commit:** fc313d1a

**2. [Rule 3 - Blocking] Jest config missing stores/ pattern**
- **Found during:** Task 3 (test execution)
- **Issue:** Frontend Jest config didn't include stores/ in testMatch patterns
- **Fix:** Added `<rootDir>/stores/**/*.test.{ts,tsx}` to testMatch and coverage
- **Files modified:** jest.config.js
- **Commit:** fd86091a

## Requirements Addressed

| ID | Requirement | Status |
|----|-------------|--------|
| DDA-05 | System excludes boss fights from adaptive scaling | Complete |

## Next Phase Readiness

### For 34-05 (Integration)
- Store exports: `useAIDirectorStore` for full access
- Hooks for selective subscriptions ready
- Boss battle detection via `startSession(true)` flag
- Transition points: Call `handleTransition()` at combo breaks, power-up uses

### Integration Pattern
```typescript
import { useAIDirectorStore } from '@/stores/aiDirectorStore';

// In AdventureGame
const { startSession, recordWord, handleTransition, endSession } = useAIDirectorStore();

// Session start
startSession(level.isBoss);

// Per word
recordWord(isValid, comboCount);

// At transitions (combo break, power-up)
handleTransition();

// Session end
endSession();
```
