# Feature: Unify Multiplayer Host and Player Views with Timer & Earthquake Fixes

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Consolidate the multiplayer host screen and player screens to use shared components and logic with role-based flags. Additionally, fix two critical bugs:
1. **Timer sync issue**: Player timers only update once per ~10 seconds instead of every second
2. **Earthquake not working**: Earthquake effects not properly triggering for non-host players

## User Story

As a multiplayer game player,
I want consistent game experience across host and player roles
So that the UI behaves identically with smooth timer updates and synchronized earthquake effects

## Problem Statement

### Issue 1: Timer Updates Only Every 10 Seconds for Players
**Root Cause Analysis:**

Looking at `backend/handlers/shared.ts` lines 130-146, the server has "smart broadcasting" that only sends timer updates when:
- `remainingTime <= 10` (last 10 seconds)
- `remainingTime <= 0` (game ended)
- `lastBroadcastTime - remainingTime >= 10` (every 10 seconds)
- `remainingTime === 60 || remainingTime === 30` (milestone times)

This is an optimization to reduce network overhead, BUT the **player's local timer should countdown smoothly**. The issue is that:
1. The `useGameTimer` hook IS designed to countdown smoothly using `requestAnimationFrame`
2. However, PlayerView passes `gameTimer` to `usePlayerGameEvents`
3. When socket events arrive, they call `gameTimerRef.current.setTime(data.remainingTime)` which resets the timer

**The Bug**: Players receive `timeUpdate` events only every ~10 seconds, and each update RESETS their local timer. Between updates, the `useGameTimer` should countdown smoothly, but something is preventing this.

Looking deeper at `PlayerView.tsx` line 143:
```javascript
const gameTimer = useGameTimer({
  initialTime: 180,
  isPaused: !gameActive,  // <-- Timer paused when gameActive is false
  autoStart: false,
});
```

**The Problem**: When `startGame` event arrives, the flow is:
1. `handleStartGame` sets `setShowStartAnimation(true)` (line 176-177)
2. But `setGameActive(true)` only happens in a `useEffect` AFTER animation completes
3. During the 3-second countdown animation, `gameActive` is still `false`
4. Timer is paused because `isPaused: !gameActive`!

Also, the timer might be stuck because `gameActive` state updates are async and the timer's `isPaused` prop might not reflect the current game state correctly.

### Issue 2: Earthquake Not Working for Non-Host Players

Looking at `usePlayerGameEvents.ts` lines 334-388, the earthquake handlers are registered and should work. However:

1. **Potential issue**: The earthquake state setters (`setEarthquakeState`, `setFireRoundActive`, `setFireRoundRemaining`) are passed as props but might not be triggering re-renders properly
2. **Fire round countdown** (lines 369-377) creates a local interval that might conflict with React state updates
3. **Grid update timing**: When fire round starts, `setLetterGrid(data.grid)` should update the grid immediately, but there might be race conditions

### Issue 3: Code Duplication Between Host and Player

The `HostInGameView` and `PlayerInGameView` are already thin wrappers around the shared `InGameScreen` component. However:
- Socket event handlers are duplicated (`useHostGameEvents` vs `usePlayerGameEvents`)
- State management differs (Host uses local state, Player uses `GameStateContext`)
- Earthquake/fire round handlers are nearly identical in both

## Solution Statement

1. **Fix Timer Sync**: Ensure player's local timer runs smoothly between server updates by:
   - Adding server-side per-second broadcasts (change `shouldBroadcast` logic)
   - OR ensuring local timer continues counting down between server updates

2. **Fix Earthquake Sync**: Ensure earthquake state propagates correctly to players by:
   - Verifying socket event handlers are properly registered
   - Fixing any state update race conditions

3. **Consolidate Code**: Extract shared logic into common utilities where duplication exists

## Feature Metadata

**Feature Type:** Bug Fix + Enhancement (Refactor)
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- `backend/handlers/shared.ts` (timer broadcasting)
- `player/hooks/socket/usePlayerGameEvents.ts` (timer sync, earthquake handlers)
- `player/PlayerView.tsx` (timer state management)
- `host/hooks/socket/useHostGameEvents.ts` (earthquake handlers)
**Dependencies:** None (internal refactoring)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - Complete codebase overview

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Timer System:**
- `backend/handlers/shared.ts` (lines 95-162)
  - **WHY:** Contains `startGameTimer` with "smart broadcasting" logic
  - **PATTERN:** Only broadcasts every 10s to reduce network overhead
  - **FIX NEEDED:** Change broadcasting to every second OR ensure local timer continues

- `hooks/useGameTimer.ts` (full file)
  - **WHY:** Local timer hook using requestAnimationFrame
  - **PATTERN:** Timestamp-based countdown, smooth updates
  - **ISSUE:** Timer needs to sync with server without being reset

- `player/PlayerView.tsx` (lines 139-155)
  - **WHY:** Timer initialization and state
  - **ISSUE:** `isPaused: !gameActive` might pause timer incorrectly

- `player/hooks/socket/usePlayerGameEvents.ts` (lines 205-244)
  - **WHY:** Handles `timeUpdate` socket events
  - **ISSUE:** `setTime()` calls might reset local countdown

**Earthquake System:**
- `backend/handlers/earthquakeHandler.ts` (full file)
  - **WHY:** Server-side earthquake sequence management
  - **PATTERN:** Broadcasts warning → shake → fire-round → end

- `player/hooks/socket/usePlayerGameEvents.ts` (lines 334-388)
  - **WHY:** Player-side earthquake event handlers
  - **ISSUE:** Fire round countdown uses local interval, might conflict

- `host/hooks/socket/useHostGameEvents.ts` (lines 278-334)
  - **WHY:** Host-side earthquake event handlers
  - **PATTERN:** Nearly identical to player handlers (duplication)

**Shared Components:**
- `host/components/HostInGameView.tsx` (full file)
  - **WHY:** Host wrapper for InGameScreen
  - **PATTERN:** Transforms host props to shared interface

- `player/components/PlayerInGameView.tsx` (full file)
  - **WHY:** Player wrapper for InGameScreen
  - **PATTERN:** Wraps InGameScreen with player-specific modals

- `components/game/InGameScreen.tsx`
  - **WHY:** Unified game screen component
  - **PATTERN:** Already shared between host and player

### Patterns to Follow

**Timer Sync Pattern:**
```typescript
// Server broadcasts every second (change this in shared.ts)
const shouldBroadcast = secondChanged; // Remove optimization, broadcast every second

// OR keep optimization but fix local timer:
// In useGameTimer, don't reset timestamp tracking on setTime()
const setTime = useCallback((time: number) => {
  // Only update if significantly different (drift correction)
  const drift = Math.abs(remainingTimeRef.current - time);
  if (drift > 1) {
    // Significant drift, resync
    accumulatedTimeRef.current = initialTime - time;
    startTimestampRef.current = performance.now();
  }
  // Always update displayed time
  setRemainingTime(time);
  remainingTimeRef.current = time;
}, [initialTime]);
```

**Earthquake Handler Pattern (to extract):**
```typescript
// shared/utils/earthquakeHandlers.ts
export function createEarthquakeHandlers(
  setEarthquakeState: Dispatch<SetStateAction<EarthquakeState>>,
  setFireRoundActive: Dispatch<SetStateAction<boolean>>,
  setFireRoundRemaining: Dispatch<SetStateAction<number>>,
  setLetterGrid: Dispatch<SetStateAction<LetterGrid | null>>,
  gameSessionIdRef: MutableRefObject<number>,
  role: 'HOST' | 'PLAYER'
) {
  // Return object with handlers to register on socket
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Fix Timer Sync Issue

**Root Cause:** Server only broadcasts timer updates every ~10 seconds, and player's local timer isn't running smoothly between updates.

**Solution Options:**
1. **Option A (Recommended):** Increase server broadcast frequency to every second
2. **Option B:** Keep sparse broadcasts but fix local timer to continue counting between syncs

**Chosen Approach: Option A** - Simpler and more reliable

**Tasks:**
1. Modify `backend/handlers/shared.ts` to broadcast timer every second
2. Remove the "smart broadcasting" optimization (it causes more problems than it solves)
3. Verify `useGameTimer.setTime()` properly syncs without breaking countdown

### Phase 2: Fix Earthquake for Players

**Root Cause:** The earthquake handlers look correct, but need to verify:
1. Socket events are being received
2. State updates are triggering re-renders
3. Grid update happens at correct time

**Tasks:**
1. Add logging to verify socket events reach players
2. Ensure `setLetterGrid` from context updates grid atomically
3. Fix fire round countdown (currently uses setInterval, should use useGameTimer pattern)

### Phase 3: Consolidate Shared Logic

**Tasks:**
1. Extract common earthquake handler logic to shared utility
2. Verify both host and player use identical handling

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `backend/handlers/shared.ts` - Broadcast Timer Every Second

- **IMPLEMENT:** Remove smart broadcasting optimization, broadcast every second
- **PATTERN:** Simple interval-based broadcasting
- **FILE:** `backend/handlers/shared.ts`
- **LINES:** 128-146

**Change from:**
```typescript
// Smart broadcasting to reduce network overhead
const secondChanged = remainingTime !== lastBroadcastSecond;
const shouldBroadcast = secondChanged && (
  remainingTime <= 10 ||
  remainingTime <= 0 ||
  (lastBroadcastTime - remainingTime >= 10) ||
  remainingTime === 60 || remainingTime === 30
);
```

**Change to:**
```typescript
// Broadcast every second for accurate client timer display
const shouldBroadcast = remainingTime !== lastBroadcastSecond;
```

- **VALIDATE:**
  ```bash
  npm run test:backend -- --testPathPattern=shared
  npm run build
  ```

### Task 2: UPDATE `hooks/useGameTimer.ts` - Smart Drift Correction

- **IMPLEMENT:** Only reset timer accumulation if drift > 1 second
- **PATTERN:** Drift correction instead of hard reset
- **FILE:** `hooks/useGameTimer.ts`
- **LINES:** 242-256

**Change `setTime` callback to:**
```typescript
const setTime = useCallback((time: number) => {
  const clampedTime = Math.max(0, time);

  // Calculate drift between local timer and server time
  const drift = Math.abs(remainingTimeRef.current - clampedTime);

  // Only reset timestamp tracking if significant drift (>1 second)
  // This prevents resetting on every server update while still correcting drift
  if (drift > 1) {
    // Significant drift detected, resync timestamps
    if (startTimestampRef.current !== null) {
      startTimestampRef.current = performance.now();
    }
    accumulatedTimeRef.current = initialTime - clampedTime;
    lastDisplayedSecondRef.current = clampedTime;
  }

  // Always update the displayed time
  setRemainingTime(clampedTime);
  remainingTimeRef.current = clampedTime;
}, [initialTime]);
```

- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern=useGameTimer
  ```

### Task 3: ADD `shared/utils/earthquakeSocketHandlers.ts` - Shared Earthquake Logic

- **IMPLEMENT:** Extract common earthquake handler logic from both host and player
- **PATTERN:** Factory function returning socket handlers
- **FILE:** `shared/utils/earthquakeSocketHandlers.ts` (NEW)

```typescript
/**
 * Shared Earthquake Socket Handlers
 * Used by both host and player to handle earthquake/fire-round socket events
 */
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { LetterGrid, EarthquakeState } from '@/shared/types';
import logger from '@/utils/logger';

interface EarthquakeHandlerDeps {
  setEarthquakeState: Dispatch<SetStateAction<EarthquakeState>>;
  setFireRoundActive: Dispatch<SetStateAction<boolean>>;
  setFireRoundRemaining: Dispatch<SetStateAction<number>>;
  setLetterGrid?: Dispatch<SetStateAction<LetterGrid | null>>;
  setTableData?: Dispatch<SetStateAction<LetterGrid | null>>;
  gameSessionIdRef: MutableRefObject<number>;
  role: 'HOST' | 'PLAYER';
}

interface FireRoundCountdownCleanup {
  cleanup: () => void;
}

let activeFireRoundInterval: NodeJS.Timeout | null = null;

export function createEarthquakeSocketHandlers(deps: EarthquakeHandlerDeps) {
  const {
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    setLetterGrid,
    setTableData,
    gameSessionIdRef,
    role,
  } = deps;

  const setGrid = setLetterGrid || setTableData;

  const handleEarthquakeWarning = (data: { gameSessionId?: number }) => {
    if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
      logger.log(`[${role}] Ignoring stale earthquakeWarning from old session`);
      return;
    }
    logger.log(`[${role}] Earthquake warning received`);
    setEarthquakeState('warning');
  };

  const handleEarthquakeShake = (data: { gameSessionId?: number }) => {
    if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
      logger.log(`[${role}] Ignoring stale earthquakeShake from old session`);
      return;
    }
    logger.log(`[${role}] Earthquake shake received`);
    setEarthquakeState('shaking');
  };

  const handleFireRoundStart = (data: { gameSessionId?: number; grid?: LetterGrid; duration?: number }) => {
    if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
      logger.log(`[${role}] Ignoring stale fireRoundStart from old session`);
      return;
    }
    logger.log(`[${role}] Fire round started - grid:`, data.grid);

    // Clear any existing countdown
    if (activeFireRoundInterval) {
      clearInterval(activeFireRoundInterval);
      activeFireRoundInterval = null;
    }

    // Update grid with new fire round grid
    if (data.grid && setGrid) {
      setGrid(data.grid);
    }

    setEarthquakeState('fire-round');
    setFireRoundActive(true);
    const duration = data.duration || 15;
    setFireRoundRemaining(duration);

    // Start countdown using interval
    let remaining = duration;
    activeFireRoundInterval = setInterval(() => {
      remaining -= 1;
      setFireRoundRemaining(remaining);
      if (remaining <= 0 && activeFireRoundInterval) {
        clearInterval(activeFireRoundInterval);
        activeFireRoundInterval = null;
      }
    }, 1000);
  };

  const handleFireRoundEnd = (data: { gameSessionId?: number }) => {
    if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
      logger.log(`[${role}] Ignoring stale fireRoundEnd from old session`);
      return;
    }
    logger.log(`[${role}] Fire round ended`);

    // Clear countdown
    if (activeFireRoundInterval) {
      clearInterval(activeFireRoundInterval);
      activeFireRoundInterval = null;
    }

    setEarthquakeState('idle');
    setFireRoundActive(false);
    setFireRoundRemaining(0);
  };

  return {
    handleEarthquakeWarning,
    handleEarthquakeShake,
    handleFireRoundStart,
    handleFireRoundEnd,
    cleanup: () => {
      if (activeFireRoundInterval) {
        clearInterval(activeFireRoundInterval);
        activeFireRoundInterval = null;
      }
    },
  };
}
```

- **VALIDATE:**
  ```bash
  npm run lint
  npm run build
  ```

### Task 4: UPDATE `player/hooks/socket/usePlayerGameEvents.ts` - Use Shared Handlers

- **IMPLEMENT:** Replace inline earthquake handlers with shared utility
- **PATTERN:** Import and use `createEarthquakeSocketHandlers`
- **FILE:** `player/hooks/socket/usePlayerGameEvents.ts`

**Add import:**
```typescript
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
```

**Replace lines 334-388 with:**
```typescript
// Create earthquake handlers using shared utility
const earthquakeHandlers = useMemo(() => createEarthquakeSocketHandlers({
  setEarthquakeState,
  setFireRoundActive,
  setFireRoundRemaining,
  setLetterGrid,
  gameSessionIdRef,
  role: 'PLAYER',
}), [setEarthquakeState, setFireRoundActive, setFireRoundRemaining, setLetterGrid]);

// In the useEffect, register handlers:
socket.on('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
socket.on('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
socket.on('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
socket.on('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);

// In cleanup:
return () => {
  // ... other cleanup
  socket.off('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
  socket.off('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
  socket.off('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
  socket.off('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
  earthquakeHandlers.cleanup();
};
```

- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern=usePlayerGameEvents
  npm run lint
  ```

### Task 5: UPDATE `host/hooks/socket/useHostGameEvents.ts` - Use Shared Handlers

- **IMPLEMENT:** Replace inline earthquake handlers with shared utility
- **PATTERN:** Import and use `createEarthquakeSocketHandlers`
- **FILE:** `host/hooks/socket/useHostGameEvents.ts`

**Same pattern as Task 4, with `role: 'HOST'` and `setTableData` instead of `setLetterGrid`**

- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern=useHostGameEvents
  npm run lint
  ```

### Task 6: ADD Tests for Timer Sync

- **IMPLEMENT:** Test that timer counts down smoothly between server updates
- **PATTERN:** Jest with fake timers
- **FILE:** `hooks/__tests__/useGameTimer.test.ts`

```typescript
describe('useGameTimer - Server Sync', () => {
  it('should continue countdown between server sync updates', () => {
    // Setup timer with 60s initial
    // Advance time by 3s locally
    // Call setTime(57) - should not reset
    // Verify timer continues from 57
  });

  it('should correct significant drift (>1s)', () => {
    // Setup timer with 60s
    // Let it count to 55 locally
    // Call setTime(50) - 5s drift
    // Verify timer resets to 50
  });
});
```

- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern=useGameTimer
  ```

### Task 7: ADD Tests for Earthquake Handlers

- **IMPLEMENT:** Test earthquake socket handlers
- **PATTERN:** Jest with socket mocks
- **FILE:** `shared/utils/__tests__/earthquakeSocketHandlers.test.ts`

- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern=earthquakeSocketHandlers
  ```

---

## TESTING STRATEGY

### Unit Tests

**Timer Tests:**
- `useGameTimer.setTime()` with small drift (<1s) - should not reset
- `useGameTimer.setTime()` with large drift (>1s) - should reset
- Timer continues countdown between server updates

**Earthquake Handler Tests:**
- Handler ignores events from old sessions
- Fire round countdown runs correctly
- Cleanup clears interval on unmount

### Integration Tests

**Multiplayer Timer Sync:**
1. Start multiplayer game
2. Observe timer on both host and player
3. Verify timers stay in sync (±1 second)

**Earthquake Sync:**
1. Start multiplayer game
2. Host triggers earthquake
3. Verify all players see warning → shake → fire round sequence
4. Verify new grid is displayed for all players

### Manual Testing Steps

1. Open two browser tabs - one as host, one as player
2. Start a game
3. Watch both timers - they should tick down together smoothly
4. Wait for earthquake (if enabled) or trigger manually
5. Verify both screens show earthquake warning, shake, then fire round
6. Verify grid changes on both screens

---

## VALIDATION COMMANDS

### Level 1: Lint & Type Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
npm run lint
npx tsc --noEmit
```

**Expected:** No errors

### Level 2: Unit Tests

```bash
npm run test:frontend -- --testPathPattern="(useGameTimer|earthquakeSocketHandlers)"
```

**Expected:** All tests pass

### Level 3: Full Test Suite

```bash
npm run test
```

**Expected:** All tests pass

### Level 4: Build

```bash
npm run build
```

**Expected:** Build succeeds

### Level 5: Manual Verification

1. Start dev server: `npm run dev`
2. Open http://localhost:3000 in two browser windows
3. Create room as host, join as player
4. Start game and observe timer sync
5. Trigger earthquake and verify sync

---

## ACCEPTANCE CRITERIA

- [ ] Timer updates every second for all players (not every 10s)
- [ ] Local timer continues smoothly between server updates
- [ ] Earthquake warning, shake, and fire round sync across all players
- [ ] New grid appears for all players during fire round
- [ ] No console errors during multiplayer gameplay
- [ ] All existing tests pass
- [ ] New tests added for timer sync and earthquake handlers
- [ ] Code is DRY - earthquake handlers use shared utility

---

## COMPLETION CHECKLIST

- [ ] Task 1: Backend timer broadcast fixed
- [ ] Task 2: useGameTimer drift correction implemented
- [ ] Task 3: Shared earthquake handlers created
- [ ] Task 4: Player uses shared earthquake handlers
- [ ] Task 5: Host uses shared earthquake handlers
- [ ] Task 6: Timer sync tests added
- [ ] Task 7: Earthquake handler tests added
- [ ] All validation commands pass
- [ ] Manual testing confirms timer and earthquake sync

---

## NOTES

### Design Rationale

**Timer Broadcasting Every Second:**
- The original "smart broadcasting" was an optimization that caused UX problems
- Network overhead of 1 broadcast/second is negligible
- User experience of smooth timer > minor network savings

**Drift Correction vs Hard Reset:**
- Server time is authoritative but network latency varies
- Local timer with drift correction provides smooth UX
- Hard reset every update causes visual stuttering

**Shared Earthquake Handlers:**
- Eliminates 60+ lines of duplicated code
- Single source of truth for earthquake logic
- Easier to maintain and debug

### Future Considerations

- Could use WebRTC for lower-latency timer sync
- Could implement predictive sync (anticipate next update)
- Consider adding visual indicator when timer is syncing

### Known Limitations

- Timer can drift by up to 1 second before correction
- Fire round countdown uses setInterval (not requestAnimationFrame)
- Earthquake trigger is host-initiated only
