---
phase: 30-boss-battle-overhaul
plan: 01
subsystem: boss-battle
tags: [xstate, state-machine, boss-battle, hooks, react]
dependency-graph:
  requires: []
  provides: [useBossStateMachine, BossStateMachineContext, BossStateMachineEvent, BossStateMachineState]
  affects: [30-02, 30-03, 30-04]
tech-stack:
  added: ["@xstate/react@6.0.0"]
  patterns: ["XState setup() pattern", "5-phase state machine", "HP threshold transitions"]
key-files:
  created:
    - hooks/useBossStateMachine.ts
    - hooks/useBossStateMachine.test.ts
    - types/bossStateMachine.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - decision: "Use XState setup() API for type-safe machine definition"
    rationale: "XState 5 uses setup() pattern for better TypeScript inference"
    alternatives: ["createMachine with inline types"]
  - decision: "HP percentage uses Math.round() for threshold comparison"
    rationale: "Prevents floating point edge cases at threshold boundaries"
    alternatives: ["Floor/ceil rounding", "Direct HP comparison"]
  - decision: "Phase transitions check HP after damage, not before"
    rationale: "Allows instant phase skips when damage is large enough"
    alternatives: ["Check HP before applying damage"]
metrics:
  duration: 10m
  completed: 2026-01-31
---

# Phase 30 Plan 01: XState 5-Phase Boss State Machine Summary

XState state machine hook for boss battles with 5-phase progression (intro/phase1/phase2/enraged/victory/defeat) and HP threshold transitions.

## Objective Achieved

Created useBossStateMachine hook using XState 5.24.0 with @xstate/react 6.0.0 for React integration. The state machine models boss battle progression with phase transitions at HP thresholds (66%, 33%, 0%).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install XState dependencies | f61b2181 | package.json, package-lock.json |
| 2 | Create types for boss state machine | f61b2181 | types/bossStateMachine.ts |
| 3 | TDD RED - Write failing tests | f61b2181 | hooks/useBossStateMachine.test.ts |
| 4 | TDD GREEN - Implement hook | f61b2181 | hooks/useBossStateMachine.ts |

## Implementation Details

### State Machine Structure

```
intro -> phase1 -> phase2 -> enraged -> victory
                                     -> defeat
```

**States:**
- `intro`: Pre-battle, no damage allowed
- `phase1`: HP >= 66%, normal combat
- `phase2`: 33% <= HP < 66%, escalated mechanics
- `enraged`: HP < 33%, maximum intensity
- `victory`: HP = 0, player wins
- `defeat`: Timer expired, player loses

**Transitions:**
- `START_BATTLE`: intro -> phase1
- `DEAL_DAMAGE`: Reduces HP, may trigger phase transitions
- `TIMER_EXPIRED`: Any active state -> defeat
- `RESET`: Any state -> intro (restores HP)

### Hook API

```typescript
const {
  state,        // Current phase
  context,      // { hp, maxHP, totalDamageDealt, bossId }
  send,         // Direct event sender
  startBattle,  // Convenience: START_BATTLE
  dealDamage,   // Convenience: DEAL_DAMAGE
  timerExpired, // Convenience: TIMER_EXPIRED
  reset,        // Convenience: RESET
  hpPercentage, // 0-100 computed value
  isActive,     // phase1 | phase2 | enraged
  isEnraged,    // enraged state
  isVictory,    // victory state
  isDefeat,     // defeat state
} = useBossStateMachine({ maxHP: 1000, bossId: 'lexicon-dragon' });
```

### Type Exports

- `BossStateMachineContext`: Context type with hp, maxHP, totalDamageDealt, bossId
- `BossStateMachineEvent`: Union of START_BATTLE, DEAL_DAMAGE, TIMER_EXPIRED, RESET
- `BossStateMachineState`: Literal union of all state names
- `UseBossStateMachineReturn`: Full return type for the hook
- `BOSS_PHASE_THRESHOLDS`: Constants { PHASE2_THRESHOLD: 66, ENRAGED_THRESHOLD: 33 }

## Test Coverage

60 tests covering:
- Initial state verification (6 tests)
- START_BATTLE transitions (4 tests)
- DEAL_DAMAGE in phase1 (7 tests)
- DEAL_DAMAGE in phase2 (3 tests)
- DEAL_DAMAGE in enraged (5 tests)
- Direct phase skips (3 tests)
- TIMER_EXPIRED transitions (7 tests)
- RESET transitions (6 tests)
- Impossible state prevention (6 tests)
- HP percentage calculation (3 tests)
- Edge cases (5 tests)
- Send function (4 tests)
- Threshold constants (2 tests)

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **XState setup() pattern**: Used instead of createMachine with inline types for better TypeScript inference in XState 5

2. **Rounded HP percentage**: Uses Math.round() for threshold comparison to avoid floating-point edge cases

3. **Phase skip on large damage**: Single DEAL_DAMAGE event can skip multiple phases (e.g., phase1 -> enraged if damage is 68%+)

## Files Changed

| File | Lines | Purpose |
|------|-------|---------|
| hooks/useBossStateMachine.ts | 338 | Main hook implementation |
| hooks/useBossStateMachine.test.ts | 993 | TDD tests (60 tests) |
| types/bossStateMachine.ts | 70 | Type definitions |
| package.json | +1 | @xstate/react dependency |
| package-lock.json | +varies | Lockfile update |

## Verification

- [x] XState 5.24.0 and @xstate/react 6.0.0 installed
- [x] types/bossStateMachine.ts compiles without errors
- [x] All 60 useBossStateMachine tests pass
- [x] npm run lint passes
- [x] npm run build succeeds

## Next Phase Readiness

This plan provides the foundation for:
- **30-02**: Replace useBossHealth with useBossStateMachine in BossHealthBar
- **30-03**: Phase ability integration (different abilities per phase)
- **30-04**: Visual phase transition effects

No blockers identified.
