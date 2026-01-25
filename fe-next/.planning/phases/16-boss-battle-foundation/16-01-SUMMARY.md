---
phase: 16-boss-battle-foundation
plan: 01
subsystem: adventure-boss-system
tags: [boss-battles, hp-tracking, phase-transitions, tdd, hooks, combo-integration]

requires:
  - phase: 15
    reason: "Combo multiplier integration (1 + comboCount * 0.1)"

provides:
  - "Boss HP tracking system with phase state machine"
  - "Damage calculation with combo and mechanic multipliers"
  - "Phase transitions: intro → active → enraged → victory/defeat"
  - "useBossHealth hook for boss battle management"

affects:
  - phase: 16-02
    impact: "Boss UI will consume healthState for HP bar rendering"
  - phase: 16-03
    impact: "Mechanic handlers will use dealDamage with mechanic multipliers"
  - phase: 16-04
    impact: "Boss battle flow will use phase transitions for game logic"

tech-stack:
  added: []
  patterns:
    - "React hooks with ref pattern for batched state updates"
    - "TDD with Given-When-Then test structure"
    - "Functional state updates to avoid closure issues"

key-files:
  created:
    - types/boss.ts: "BossPhase type and health state interfaces"
    - hooks/useBossHealth.ts: "Boss HP tracking hook (156 lines)"
    - hooks/__tests__/useBossHealth.test.ts: "21 comprehensive tests (461 lines)"
  modified: []

decisions:
  - id: boss-phase-state-machine
    decision: "Use 5-phase state machine: intro → active → enraged → victory → defeat"
    rationale: "Clear separation of game flow stages, enraged phase at 25% HP creates urgency"
    alternatives: "Could use HP percentage directly, but explicit phases make UI/logic clearer"

  - id: combo-multiplier-formula
    decision: "Combo multiplier = 1 + (comboCount * 0.1), stacks with mechanic multiplier"
    rationale: "Integrates Phase 15 combo system, 10% bonus per combo chain is balanced"
    alternatives: "Could use exponential scaling, but linear is more predictable"

  - id: enraged-threshold
    decision: "Boss enters enraged phase at 25% HP (not 20% or 30%)"
    rationale: "25% is standard boss battle design, gives enough time for mechanic intensification"
    alternatives: "Could be configurable per boss, but standardizing simplifies implementation"

  - id: ref-pattern-for-batching
    decision: "Use useRef + immediate updates to avoid closure issues in batched state updates"
    rationale: "Allows startBattle() + dealDamage() in same render without stale phase value"
    alternatives: "Could use single state object, but multiple useState is more React-idiomatic"

metrics:
  duration: "11m 46s"
  files_changed: 3
  lines_added: 663
  tests_added: 21
  test_coverage: "100%"
  completed: "2026-01-25"
---

# Phase 16 Plan 01: Boss HP Tracking Summary

**One-liner:** Boss HP state machine with combo-multiplied damage, phase transitions at 25% (enraged), and TDD-verified edge cases

## Overview

Implemented the core boss health tracking system using strict TDD methodology (RED-GREEN-REFACTOR). The `useBossHealth` hook manages HP, phase transitions, and damage calculation with multipliers from combo chains (Phase 15) and boss mechanics (future phases).

**Key Achievement:** Complete TDD cycle with 21 passing tests covering initialization, damage calculation, phase transitions, and all edge cases.

## What Was Built

### 1. Type Definitions (types/boss.ts)
- **BossPhase type**: 5-phase state machine
  - `intro`: Pre-battle cutscene
  - `active`: Normal gameplay (HP > 25%)
  - `enraged`: Below 25% HP, mechanics intensify
  - `victory`: Player defeated boss (HP = 0)
  - `defeat`: Player lost (timer expired)

- **BossHealthState interface**: Complete HP state
  - `currentHP`, `maxHP`, `phase`, `totalDamageDealt`, `isActive`

- **UseBossHealthReturn interface**: Hook contract
  - State: `healthState`, `hpPercentage`, `isEnraged`
  - Actions: `dealDamage`, `startBattle`, `endBattle`, `resetHealth`

### 2. Boss Health Hook (hooks/useBossHealth.ts)

**Core Functionality:**
- HP tracking with phase-based state machine
- Damage calculation: `baseDamage * (1 + comboCount * 0.1) * mechanicMultiplier`
- Automatic phase transitions:
  - HP reaches 0 → `victory`
  - HP drops below 25% → `enraged` (from `active`)
  - Timer expires → `defeat` (via `endBattle(false)`)

**Technical Implementation:**
- Uses `useRef` pattern to avoid closure issues in batched state updates
- Immediate ref updates in `startBattle`, `dealDamage`, `endBattle`, `resetHealth`
- Functional setState to ensure latest values in concurrent calls
- Computed properties: `hpPercentage`, `isEnraged`, `isActive`

**Edge Cases Handled:**
- Overkill damage (HP clamped to 0, full damage recorded)
- Phase restrictions (no damage in intro/victory/defeat)
- Multiple damage calls in same render (functional setState)
- Concurrent startBattle + dealDamage (ref pattern)

### 3. Test Suite (hooks/__tests__/useBossHealth.test.ts)

**21 Tests Following Given-When-Then:**

**Initialization (2 tests)**
- Default state in intro phase
- Custom maxHP initialization

**startBattle (2 tests)**
- Phase transition intro → active
- HP unchanged on start

**dealDamage (9 tests)**
- Base damage without multipliers
- Combo multiplier application (Phase 15 integration)
- Mechanic multiplier application
- Both multipliers stacking
- Damage accumulation
- HP clamping at 0 (overkill)
- Phase restrictions (intro/victory/defeat)

**Phase Transitions (3 tests)**
- Enraged at 25% HP threshold
- Stay enraged when HP drops further
- Victory when HP reaches 0

**endBattle (2 tests)**
- Victory transition (isVictory=true)
- Defeat transition (isVictory=false)

**resetHealth (1 test)**
- Reset to initial state

**Computed Properties (2 tests)**
- HP percentage calculation (0-100)
- isEnraged based on HP percentage

## Integration Points

### Phase 15 (Chain Combo System)
- **Combo multiplier integration:** `1 + (comboCount * 0.1)`
- Each combo chain adds 10% damage bonus
- Stacks multiplicatively with mechanic multiplier

**Example:**
- Base damage: 100
- Combo count: 5 → multiplier = 1.5
- Mechanic multiplier: 2.0
- **Total damage: 100 * 1.5 * 2.0 = 300**

### Future Phases
- **Phase 16-02 (Boss UI):** Will consume `healthState` for HP bar rendering
- **Phase 16-03 (Mechanics):** Will call `dealDamage` with mechanic multipliers
- **Phase 16-04 (Battle Flow):** Will use phase transitions for game logic

## Technical Decisions

### Why useRef Pattern?
React batches state updates, causing closure issues when `startBattle()` and `dealDamage()` are called in the same render. The `phase` value in `dealDamage` would be stale (still `intro`).

**Solution:** Use `useRef` and update it immediately on phase changes, ensuring `dealDamage` always sees current phase.

**Code Example:**
```typescript
// Without ref: dealDamage sees stale phase
act(() => {
  startBattle();      // Sets phase to 'active'
  dealDamage(100);    // Sees phase='intro' (closure) → returns 0 damage
});

// With ref: dealDamage sees current phase
const startBattle = () => {
  setPhase('active');
  phaseRef.current = 'active';  // Immediate update
};
// Now dealDamage sees 'active' → deals damage correctly
```

### Why 25% Enraged Threshold?
- **Industry standard:** Most boss battles use 25-30% for "rage phase"
- **Timing:** Provides enough gameplay time in enraged phase
- **Urgency:** Creates tension without feeling unfair
- **Mechanics:** Leaves room for mechanic intensification (future phases)

### Why Linear Combo Scaling?
- **Predictability:** Players can calculate damage easily
- **Balance:** 10% per combo is significant but not overpowered
- **Stack-friendly:** Works well with mechanic multipliers
- **Alternative rejected:** Exponential scaling (too punishing for low combos)

## Deviations from Plan

None - plan executed exactly as written.

All must-haves satisfied:
- ✅ Boss HP decreases on valid word submission
- ✅ Phase transition active → enraged at 25% HP
- ✅ Phase transition to victory at 0 HP
- ✅ Combo count multiplies damage
- ✅ useBossHealth hook exported with all required functions
- ✅ 21+ tests (exceeded 17+ minimum)
- ✅ 100% test coverage

## Verification Results

**TypeScript:** ✅ Compiles (pre-existing test errors in other files, not related to this work)
**Tests:** ✅ 21/21 passing (100% coverage)
**Lint:** ✅ No errors
**Build:** ✅ Production build succeeds

## Next Phase Readiness

**Phase 16-02 (Boss HP Bar UI)** is ready to begin:
- ✅ `BossHealthState` interface defined
- ✅ `hpPercentage` computed property available
- ✅ `isEnraged` boolean for visual state changes
- ✅ Hook fully tested and verified

**No blockers or concerns.**

## Files Changed

### Created (3 files, 773 lines)

**types/boss.ts** (+46 lines)
- BossPhase type definition
- BossHealthState interface
- UseBossHealthReturn interface

**hooks/useBossHealth.ts** (+156 lines)
- Boss HP tracking hook
- Phase state machine
- Damage calculation with multipliers
- Ref pattern for batched updates

**hooks/__tests__/useBossHealth.test.ts** (+461 lines)
- 21 comprehensive tests
- Given-When-Then structure
- 100% coverage of hook functionality

### Modified
None

## Commits

1. **d652bde7** - `feat(16-01): add BossPhase type and health state interfaces`
   - Added type definitions to types/boss.ts
   - 46 lines added

2. **248e2fee** - `test(16-01): add failing tests for useBossHealth hook (RED phase)`
   - 21 test cases following Given-When-Then
   - All tests failing (hook not implemented)
   - 461 lines added

3. **470429f9** - `feat(16-01): implement useBossHealth hook (GREEN phase)`
   - Complete hook implementation
   - All 21 tests passing
   - 156 lines added

**Total:** 3 commits, 663 lines added, 0 lines removed

## Lessons Learned

### TDD Process Worked Perfectly
- Writing tests first forced clear API design
- Edge cases discovered during test writing (not debugging later)
- Green phase was smooth - just implement to pass tests
- Refactoring safe with comprehensive test coverage

### React Hook Challenges
- Batched state updates require ref pattern for same-render calls
- Functional setState crucial for multiple updates in one render
- Dependencies must be carefully managed to avoid stale closures

### Test Quality Matters
- Given-When-Then comments make tests self-documenting
- Testing edge cases (overkill, phase restrictions) prevented future bugs
- 21 tests might seem excessive, but they cover ALL scenarios

## Conclusion

Successfully implemented boss HP tracking system using strict TDD methodology. The `useBossHealth` hook provides a solid foundation for boss battle mechanics with:

- ✅ Clean phase-based state machine
- ✅ Accurate damage calculation with multipliers
- ✅ Phase 15 combo system integration
- ✅ 100% test coverage with edge cases
- ✅ No technical debt

**Status:** ✅ Complete and verified
**Duration:** 11m 46s
**Quality:** Production-ready
