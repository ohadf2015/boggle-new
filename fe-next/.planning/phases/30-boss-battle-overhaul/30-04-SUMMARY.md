---
phase: 30
plan: 04
subsystem: boss-battle
tags: ["ability-system", "registry-pattern", "hooks", "tdd"]
requires: ["30-01", "30-03"]
provides: ["boss-ability-types", "ability-registry", "useBossAbilities-hook"]
affects: ["30-05", "30-06", "30-07", "30-08"]
tech-stack:
  added: []
  patterns: ["registry-pattern", "condition-checking", "state-management"]
key-files:
  created:
    - types/bossAbility.ts
    - lib/adventure/abilities/registry.ts
    - lib/adventure/abilities/registry.test.ts
    - hooks/useBossAbilities.ts
    - hooks/useBossAbilities.test.ts
  modified: []
decisions:
  - id: "30-04-01"
    choice: "Registry pattern for abilities"
    alternatives: ["hardcoded arrays", "config files"]
    rationale: "Extensible architecture allows adding new abilities without modifying core code"
  - id: "30-04-02"
    choice: "Priority-based activation checking"
    alternatives: ["random selection", "round-robin"]
    rationale: "Higher-priority abilities should be checked first to ensure important attacks trigger"
  - id: "30-04-03"
    choice: "Phase order for comparisons"
    alternatives: ["numeric indices", "enum values"]
    rationale: "String-based phase names match state machine states, array index enables comparison operators"
  - id: "30-04-04"
    choice: "Cooldown in milliseconds internally"
    alternatives: ["seconds", "frames"]
    rationale: "Milliseconds provide precision for tickCooldowns, seconds in config for readability"
metrics:
  duration: "14 minutes"
  completed: "2026-01-31"
---

# Phase 30 Plan 04: Boss Ability System Summary

Extensible boss ability system with registry pattern and lifecycle management hook.

## One-Liner

Registry-based ability system with phase/HP activation conditions, cooldown tracking, and telegraph integration.

## What Was Built

### 1. Boss Ability Type Definitions (types/bossAbility.ts)

Comprehensive TypeScript interfaces for the ability system:

- **TelegraphConfig**: 2s warning configuration (duration, visualType, particleEffect)
- **AbilityTarget**: Tile targeting (random, row, column, diagonal, all, specific)
- **AbilityEffect**: 7 effect types (change_tiles, lock_tiles, scramble, timer_penalty, score_modifier, spawn_special, requirement)
- **ActivationCondition**: 5 condition types (phase, hp_threshold, time_elapsed, words_found, combo_count)
- **BossAbility**: Complete ability definition (id, bossId, cooldown, conditions, effects, telegraph, priority)
- **AbilityRuntimeState**: Battle-time tracking (cooldownRemaining, isTelegraphing, useCount, lastActivatedAt)
- **UseBossAbilitiesReturn**: Hook return type interface

### 2. BossAbilityRegistry (lib/adventure/abilities/registry.ts)

Extensible registry class for managing boss abilities:

```typescript
// Register abilities at app startup
abilityRegistry.register({
  id: 'pop-quiz',
  bossId: 'ms-grammar',
  activationConditions: [{ type: 'phase', value: 'phase1' }],
  effects: [{ type: 'requirement', params: { requirementType: 'doubleLetters' } }],
  // ... other fields
});

// Get abilities for a specific boss (sorted by priority)
const abilities = abilityRegistry.getForBoss('ms-grammar');
```

Methods:
- `register(ability)`: Add ability to registry
- `get(id)`: Get ability by ID
- `getForBoss(bossId)`: Get all abilities for boss (priority sorted)
- `has(id)`: Check if ability exists
- `unregister(id)`: Remove ability
- `getAll()`: Get all registered abilities
- `clear()`: Remove all abilities

### 3. useBossAbilities Hook (hooks/useBossAbilities.ts)

React hook for managing ability lifecycle during battles:

```typescript
const {
  abilities,           // All abilities for this boss
  abilityStates,       // Runtime state Map
  telegraphingAbility, // Currently telegraphing ability
  checkActivation,     // Check if ability can activate
  startAbility,        // Begin telegraph
  executeAbility,      // Apply effects + start cooldown
  tickCooldowns,       // Decrement cooldowns
  resetAbilities,      // Reset for new battle
} = useBossAbilities('ms-grammar');
```

Condition checking:
- **Phase conditions**: Support =, <, >, <=, >= operators
- **HP threshold**: Percentage-based with comparison operators
- **Priority order**: Higher priority abilities checked first
- **Cooldown gating**: Abilities on cooldown are skipped

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pattern | Registry | Extensible, allows runtime ability registration |
| Priority | Higher first | Ensures important abilities activate over minor ones |
| Phase comparison | String array index | Matches state machine, enables comparison operators |
| Cooldowns | Milliseconds internal | Precision for ticking, seconds in config for UX |

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| registry.test.ts | 16 | 100% |
| useBossAbilities.test.ts | 36 | 100% |
| **Total** | **52** | **100%** |

Test categories:
- Registry: register, get, getForBoss, unregister, has, getAll, clear
- Hook: initial state, checkActivation, startAbility, executeAbility, tickCooldowns, resetAbilities
- Operators: phase >=, HP threshold <=

## File Changes

| File | Lines | Purpose |
|------|-------|---------|
| types/bossAbility.ts | 191 | Type definitions |
| lib/adventure/abilities/registry.ts | 136 | Registry class |
| lib/adventure/abilities/registry.test.ts | 172 | Registry tests |
| hooks/useBossAbilities.ts | 304 | Lifecycle hook |
| hooks/useBossAbilities.test.ts | 388 | Hook tests |

## Integration Points

- **30-01 useBossStateMachine**: Context and state types imported for condition checking
- **30-03 useAttackTelegraph**: Telegraph duration from ability config will connect here
- **30-05 Visual Phase Transitions**: Ability activation can trigger phase-based visuals
- **30-06 Ability Cooldowns**: Foundation built, UI will connect to cooldownRemaining
- **30-07 Phase-Based Escalation**: activationConditions support phase-based ability unlocking

## Deviations from Plan

None - plan executed exactly as written.

## Verification Checklist

- [x] types/bossAbility.ts compiles without errors
- [x] BossAbilityRegistry tests pass (16 tests)
- [x] useBossAbilities tests pass (36 tests)
- [x] Ability activation conditions work correctly
- [x] Cooldown tracking works correctly
- [x] npm run lint passes
- [x] npm run build succeeds (verified with stashed unrelated changes)

## Next Phase Readiness

**Ready for 30-05 (Visual Phase Transitions)**
- Ability system provides activation hooks for triggering visual effects
- Telegraph integration point established

**Ready for 30-06 (Ability Cooldowns UI)**
- cooldownRemaining exposed in abilityStates
- tickCooldowns ready for use in useEffect

**Dependencies satisfied:**
- 30-01 state machine types used for condition checking
- 30-03 telegraph system referenced in TelegraphConfig type
