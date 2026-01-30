---
phase: 27-dynamic-board-mechanics
plan: 01
subsystem: gameplay-mechanics
tags: [react-hooks, state-machine, tdd, candy-crush, cascade, animation]

# Dependency graph
requires:
  - phase: 26-meta-progression-foundation
    provides: Core adventure infrastructure and types (TileState, adventure.ts types)
provides:
  - Cascade loop state machine for tile removal/refill cycle
  - Pure functions for gravity, spawning, and match detection (stub)
  - Phase-based animation timing system with reduced motion support
  - Safety limits preventing infinite cascade loops
affects:
  - 27-02 (Tile removal and refill - will use cascade state machine)
  - 27-03 (Explosion effects - will coordinate with cascade phases)
  - 27-04 (Special tile spawning - will use spawn logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - State machine with useReducer for phase transitions
    - Pure function exports for testability (applyGravity, spawnNewTiles, checkForMatches)
    - Reduced motion detection via matchMedia API
    - Phase-based timing with setTimeout coordination
    - TDD with RED-GREEN-REFACTOR cycle

key-files:
  created:
    - hooks/useCascadeLoop.ts - Cascade state machine hook
    - hooks/__tests__/useCascadeLoop.test.ts - Comprehensive test coverage (20 tests)
  modified: []

key-decisions:
  - "250ms per phase for smooth animations (750ms total single cascade)"
  - "MVP limitation: checkForMatches returns false (single cascade only, documented for future enhancement)"
  - "Safety limit of 10 iterations prevents infinite loops"
  - "Reduced motion users get instant transitions (0ms delays)"
  - "Phase callbacks (onPhaseChange) for UI coordination"

patterns-established:
  - "Pure functions exported alongside hooks for reusability"
  - "State machine with explicit phase transitions via reducer"
  - "Test-first development with 20 comprehensive test cases"
  - "JSDOM environment handling with matchMedia polyfill guards"

# Metrics
duration: 45min
completed: 2026-01-30
---

# Phase 27 Plan 01: Cascade Loop State Machine Summary

**State machine managing "match → remove → gravity → spawn → re-check" cycle with 250ms phase timing, pure function gravity/spawn logic, and safety limits**

## Performance

- **Duration:** 45 minutes
- **Started:** 2026-01-30T15:04:30Z
- **Completed:** 2026-01-30T15:49:30Z
- **Tasks:** 1 (TDD implementation)
- **Files modified:** 2 (1 implementation + 1 test file)

## Accomplishments

- Created cascade loop state machine with 5 phases (idle → removing → falling → spawning → checking → idle)
- Implemented pure functions for gravity calculation, tile spawning, and match detection (MVP stub)
- Added safety limit preventing infinite cascade loops (max 10 iterations)
- Full test coverage with 20 tests following TDD methodology (RED-GREEN-REFACTOR)
- Reduced motion accessibility support with instant phase transitions
- Phase callback system for UI coordination

## Task Commits

Each task was committed atomically:

1. **Task 1: Cascade Loop State Machine** - `7c34f4e5` (feat)
   - TDD implementation with RED-GREEN-REFACTOR cycle
   - Hook with 5-phase state machine
   - Pure functions: applyGravity, spawnNewTiles, checkForMatches
   - 20 comprehensive tests covering all phases and edge cases
   - TypeScript types: CascadePhase, CascadeState, CascadeLoopOptions

**Plan metadata:** (not committed separately - single-task plan)

## Files Created/Modified

- `hooks/useCascadeLoop.ts` - Cascade state machine hook with phase transitions, timing, and pure helper functions (370 lines)
- `hooks/__tests__/useCascadeLoop.test.ts` - Comprehensive test suite with 20 tests covering state machine, pure functions, timing, and edge cases (500+ lines)

## Decisions Made

**1. 250ms phase duration for smooth visual feedback**
- Rationale: Balances animation visibility with gameplay speed. Each phase (removing/falling/spawning) gets 250ms, totaling 750ms per cascade.
- Impact: Creates Candy Crush-like "satisfying cascade" feel without slowing gameplay.

**2. MVP limitation: checkForMatches always returns false**
- Rationale: Match detection requires word validation integration, which would expand scope significantly. Documented as BOARD-05 limitation.
- Impact: Single cascade only for MVP. Future enhancement will enable continuous cascade chains.
- Documentation: TODO comment in code, test coverage for stub behavior.

**3. Safety limit: 10 iterations maximum**
- Rationale: Prevents infinite loops even if future match detection has bugs.
- Impact: Graceful failure mode, game never locks up.

**4. Pure function exports (applyGravity, spawnNewTiles, checkForMatches)**
- Rationale: Enables independent testing, reusability in other contexts (backend validation, AI preview).
- Impact: Better test coverage, easier to reason about gravity/spawn logic.

**5. Reduced motion support via matchMedia**
- Rationale: WCAG 2.1 AA compliance, prevents motion sickness for sensitive users.
- Impact: 0ms phase transitions when prefers-reduced-motion is set.
- Implementation: Added guards for JSDOM environment (matchMedia not defined in tests).

## Deviations from Plan

None - plan executed exactly as written.

**Note:** The plan correctly anticipated the MVP limitation (checkForMatches stub) and specified it in the behavior section. Implementation followed TDD precisely with RED-GREEN-REFACTOR cycle.

## Issues Encountered

**1. JSDOM matchMedia not defined**
- Problem: window.matchMedia not available in Jest/JSDOM test environment
- Solution: Added conditional check (`typeof window !== 'undefined' && window.matchMedia`) to prevent errors
- Impact: Tests pass in both JSDOM and browser environments

**2. TypeScript generic type inference for Set/Map**
- Problem: `new Set()` inferred as `Set<unknown>` causing type errors
- Solution: Explicit type parameters (`new Set<string>()`, `new Map<string, number>()`)
- Impact: TypeScript compiles without errors

**3. Phase transition timing in tests**
- Problem: Checking phase transitions synchronously caused flaky tests
- Solution: Used `waitFor` from @testing-library/react for async phase checks
- Impact: Tests are reliable and correctly verify async behavior

All issues were development-time problems resolved during implementation. No runtime bugs or API changes required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plan (27-02: Tile Removal and Refill)**

What's ready:
- Cascade state machine fully functional and tested
- Pure functions (applyGravity, spawnNewTiles) ready for integration
- Phase callbacks (onPhaseChange) enable UI coordination
- Safety limits and reduced motion support in place

What's needed next:
- Integration with AdventureGrid component to actually remove/refill tiles
- Connection to word validation to trigger cascade on word submission
- Visual animations coordinated with cascade phases (using onPhaseChange)

Blockers/concerns:
- None - all dependencies met, MVP limitation documented

---
*Phase: 27-dynamic-board-mechanics*
*Completed: 2026-01-30*
