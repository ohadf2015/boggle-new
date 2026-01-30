---
phase: 28-power-up-system
plan: 01
subsystem: game-mechanics
tags: [react-hooks, state-machine, typescript, tdd, cooldown, power-ups]

# Dependency graph
requires:
  - phase: 27-dynamic-board-mechanics
    provides: Adventure mode game state foundation
provides:
  - PowerUp type definitions (PowerUpType, PowerUpState, PowerUp interface)
  - POWER_UP_CONFIG constant with effect durations
  - usePowerUpState hook for cooldown state machine
  - Timestamp-based cooldown calculation (drift-free)
affects: [28-02-power-up-ui, 28-03-power-up-effects, game-mechanics, adventure-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timestamp-based state machine using Date.now() for drift-free cooldown"
    - "TDD with RED-GREEN-REFACTOR cycle (16 tests, 98% coverage)"
    - "useRef for timestamp tracking (avoids re-renders)"
    - "100ms UI update interval for smooth countdown display"

key-files:
  created:
    - hooks/usePowerUpState.ts
    - hooks/__tests__/usePowerUpState.test.ts
  modified:
    - types/adventure.ts

key-decisions:
  - "Timestamp-based cooldown using Date.now() prevents drift from setInterval"
  - "60-second cooldown constant for all power-ups"
  - "Effect durations: freezeTime=0s, hint=0s, scoreMultiplier=30s"
  - "State machine lifecycle: ready -> active -> cooldown -> ready"

patterns-established:
  - "Power-up hook pattern: usePowerUpState(type) returns { powerUp, activate, isReady }"
  - "Instant vs duration-based effects: 0s = immediate cooldown, >0s = setTimeout transition"
  - "UI updates via 100ms interval during cooldown (requestAnimationFrame for React 19+)"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 28 Plan 01: Power-Up Foundation Summary

**Timestamp-based cooldown state machine with 60s cycles, supporting instant (freezeTime, hint) and duration (scoreMultiplier 30s) power-ups via TDD**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T18:00:53Z
- **Completed:** 2026-01-30T18:05:15Z
- **Tasks:** 1 (single TDD task with RED-GREEN-REFACTOR cycle)
- **Files modified:** 3

## Accomplishments

- Implemented power-up type system (PowerUpType, PowerUpState, PowerUp interface)
- Created usePowerUpState hook with timestamp-based cooldown (prevents drift)
- Achieved 98% test coverage with 16 comprehensive tests
- Established state machine pattern: ready -> active -> cooldown (60s) -> ready
- Defined effect durations: instant (0s) for freezeTime/hint, duration (30s) for scoreMultiplier

## Task Commits

1. **Task 1: Power-Up Types and State Machine (TDD)** - `e95f84ae` (feat)
   - RED: 16 failing tests for state machine lifecycle
   - GREEN: Types + hook implementation, all tests passing
   - REFACTOR: Fixed duplicate imports, maintained 98% coverage

## Files Created/Modified

- `types/adventure.ts` - Added PowerUpType, PowerUpState, PowerUp interface, POWER_UP_CONFIG constant
- `hooks/usePowerUpState.ts` - State machine hook with timestamp-based cooldown tracking
- `hooks/__tests__/usePowerUpState.test.ts` - TDD test suite (16 tests, 98% coverage)

## Decisions Made

**1. Timestamp-based cooldown calculation**
- Uses Date.now() for activation timestamp, calculates elapsed time on each update
- Prevents drift from setInterval/setTimeout accumulation
- Pattern: `remainingCooldown = Math.max(0, totalCooldown - elapsedSeconds)`

**2. 60-second cooldown for all power-ups**
- Single constant (COOLDOWN_DURATION = 60) enforced across all types
- Keeps system simple and balanced for v2.0
- Future: Could make per-type if playtesting shows need

**3. Effect duration differentiation**
- Instant power-ups (freezeTime, hint): effectDuration = 0, immediate cooldown transition
- Duration power-ups (scoreMultiplier): effectDuration = 30, setTimeout for effect period

**4. useRef for timestamp storage**
- Avoids re-renders when updating activatedAt timestamp
- State only updates for UI-relevant changes (state, remainingCooldown)
- Performance optimization for smooth gameplay

**5. 100ms UI update interval**
- Smooth countdown display during cooldown phase
- Balances UX smoothness with performance (10 updates/second)
- Could migrate to requestAnimationFrame in React 19+ for vsync alignment

## Deviations from Plan

None - plan executed exactly as written following TDD cycle.

## Issues Encountered

**1. ESLint duplicate import error**
- **Issue:** Separate type import and value import from same module
- **Fix:** Combined into single import: `import { POWER_UP_CONFIG, type PowerUpType, type PowerUp, type PowerUpState }`
- **Resolution:** Lint passes, tests still green

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 28-02 (Power-Up UI Components):**
- ✅ PowerUp interface defined for UI rendering
- ✅ usePowerUpState hook ready for component integration
- ✅ State machine tested (ready/active/cooldown transitions)
- ✅ Timestamp-based cooldown calculation verified

**Future plans can use:**
- `usePowerUpState('freezeTime')` for freeze timer button
- `usePowerUpState('hint')` for hint button
- `usePowerUpState('scoreMultiplier')` for multiplier button
- `powerUp.remainingCooldown` for circular progress indicators
- `powerUp.state` for button disabled states and visual feedback

**No blockers.** Foundation complete for power-up UI and effects implementation.

---
*Phase: 28-power-up-system*
*Completed: 2026-01-30*
