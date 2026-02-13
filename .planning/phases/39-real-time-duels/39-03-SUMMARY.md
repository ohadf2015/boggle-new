---
phase: 39-real-time-duels
plan: 03
subsystem: api
tags: [socket.io, websocket, real-time, react-hooks, duels]

# Dependency graph
requires:
  - phase: 39-01
    provides: Real-time handler infrastructure (word submission, game state, timer)
  - phase: 39-02
    provides: Disconnection grace period system
provides:
  - Wired duel handler registry with all 5 handler groups
  - Extended useDuelSocket hook with real-time actions and 7 new event listeners
  - duelType parameter for challenge creation (async/realtime)
  - Lifecycle accept handler branching on duel type
affects: [39-04, 39-05, real-time-ui, duel-gameplay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Type extraction pattern (separate .types.ts file for hooks >400 lines)
    - Event listener cleanup pattern (return unsubscribe function)
    - Optional parameter defaults (duelType defaults to 'async')

key-files:
  created:
    - fe-next/hooks/useDuelSocket.types.ts
  modified:
    - fe-next/backend/handlers/duel/index.ts
    - fe-next/backend/handlers/duel/lifecycle.ts
    - fe-next/backend/handlers/duel/types.ts
    - fe-next/hooks/useDuelSocket.ts
    - fe-next/components/education/duels/__tests__/DuelGameView.test.tsx

key-decisions:
  - "duelType defaults to 'async' for backward compatibility"
  - "Types extracted to separate file to keep hook under 500 lines"
  - "All listeners follow existing cleanup pattern (useCallback, ref tracking)"

patterns-established:
  - "Hook type extraction: When hook exceeds 400 lines, extract types to .types.ts"
  - "Event listener pattern: useCallback wrapper, ref storage, cleanup function"
  - "Optional enum parameters: Provide sensible default (async) for gradual rollout"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 39 Plan 03: Real-Time Duel Integration Summary

**Wired 5 handler groups (lifecycle, lobby, gameplay, realtime, disconnection) into duel registry and extended useDuelSocket hook with 3 real-time actions + 7 event listeners**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-13T20:36:09Z
- **Completed:** 2026-02-13T20:43:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Handler registry now wires all 5 handler groups for every socket connection
- useDuelSocket hook provides submitWord, forfeitDuel, syncState actions
- useDuelSocket hook exposes 7 new event listeners (onDuelStarted, onWordAccepted, onWordRejected, onOpponentProgress, onOpponentDisconnected, onOpponentReconnected, onStateSynced)
- Lifecycle accept handler detects realtime duel type and calls startRealtimeDuel
- duelType parameter added to createChallenge with backward-compatible default

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire realtime + disconnection handlers into registry and lifecycle** - `383e4629` (feat)
2. **Task 2: Extend useDuelSocket hook with real-time actions and listeners** - `abe061f5` (feat)

## Files Created/Modified
- `fe-next/backend/handlers/duel/index.ts` - Registry wiring for all 5 handler groups
- `fe-next/backend/handlers/duel/lifecycle.ts` - Accept handler branching on duel_type
- `fe-next/backend/handlers/duel/types.ts` - Added duelType enum to createDuelSchema
- `fe-next/hooks/useDuelSocket.ts` - Extended with real-time actions and listeners
- `fe-next/hooks/useDuelSocket.types.ts` - Type definitions extracted from hook
- `fe-next/components/education/duels/__tests__/DuelGameView.test.tsx` - Updated mock to include new methods

## Decisions Made

**1. duelType defaults to 'async'**
- Rationale: Backward compatibility. Existing code can call createChallenge without 4th parameter.
- Pattern: `duelType?: 'async' | 'realtime' = 'async'` in createChallenge signature

**2. Types extracted to separate file**
- Rationale: useDuelSocket.ts exceeded 500-line limit after adding 7 new listeners
- Pattern: Create `useDuelSocket.types.ts`, import types, re-export for consumers
- Result: Hook reduced from 518 to 431 lines

**3. All listeners follow existing cleanup pattern**
- Rationale: Consistency with existing listeners (onChallengeReceived, onLobbyUpdate, etc.)
- Pattern: useCallback wrapper, ref storage in listenersRef, return cleanup function
- Benefit: React useEffect compatible, automatic cleanup on unmount

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed duplicate import lint error**
- **Found during:** Task 2 (lint check after extending hook)
- **Issue:** `realtime.ts` had separate type import and value import from `./types`
- **Fix:** Combined imports: `import { type DuelSocket, type SubmitWordPayload, submitWordSchema } from './types'`
- **Files modified:** `fe-next/backend/handlers/duel/realtime.ts`
- **Verification:** `npm run lint -- --quiet` passes
- **Committed in:** abe061f5 (Task 2 commit)

**2. [Rule 3 - Blocking] Added missing hook methods to test mock**
- **Found during:** TypeScript compilation after extending hook interface
- **Issue:** DuelGameView.test.tsx mock missing new methods (submitWord, forfeitDuel, syncState, 7 listeners)
- **Fix:** Added all new methods to mockUseDuelSocket return value with jest.fn() implementations
- **Files modified:** `fe-next/components/education/duels/__tests__/DuelGameView.test.tsx`
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** abe061f5 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation and lint to pass. No scope creep.

## Issues Encountered
None - plan executed smoothly

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend infrastructure fully wired and ready for UI integration
- useDuelSocket hook provides complete API for real-time gameplay
- Ready for Phase 39-04: Real-time UI components (game view, opponent progress, disconnection handling)
- Ready for Phase 39-05: Real-time duel flow testing

---
*Phase: 39-real-time-duels*
*Completed: 2026-02-13*
