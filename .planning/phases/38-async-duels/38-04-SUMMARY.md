---
phase: 38-async-duels
plan: 04
type: execute
subsystem: education-duels
completed: 2026-02-13
duration: 16min
tags: [socket.io, react-hooks, lobby, real-time, presence]

requires:
  - 38-01  # CRUD operations and types
  - 38-02  # Lifecycle handlers

provides:
  - useDuelSocket hook for /duel namespace connection
  - Lobby handlers for opponent presence tracking
  - Unified handler registry for duel namespace
  - In-memory lobby tracking per classroom

affects:
  - 38-05  # Will use useDuelSocket + lobby for UI

tech-stack:
  added: []
  patterns:
    - Socket.IO namespace isolation (/duel)
    - React hook pattern for WebSocket connections
    - In-memory Map tracking for lobby presence
    - Event listener cleanup pattern

key-files:
  created:
    - fe-next/hooks/useDuelSocket.ts
    - fe-next/hooks/__tests__/useDuelSocket.test.ts
    - fe-next/backend/handlers/duel/lobby.ts
    - fe-next/backend/handlers/duel/__tests__/lobby.test.ts
  modified:
    - fe-next/backend/handlers/duel/index.ts
    - fe-next/components/education/ActiveGamesIndicator.tsx

decisions:
  - title: In-memory lobby tracking acceptable for single-server
    rationale: Map<classroomId, Map<userId, OpponentInfo>> sufficient for current deployment
    impact: Would need Redis/distributed state for multi-server
    status: accepted

  - title: Socket.IO event listener cleanup pattern
    rationale: Return cleanup function from on* methods for React useEffect compatibility
    impact: Cleaner component unmount, prevents memory leaks
    status: accepted

  - title: Lobby state vs lobby update events
    rationale: New joiner gets full state (lobby-state), others get delta (lobby-update)
    impact: Reduces bandwidth for existing lobby members
    status: accepted
---

# Phase 38 Plan 04: Socket Hook + Lobby Handlers Summary

**One-liner:** Socket.IO /duel namespace React hook with lobby presence and unified handler registry

## What Was Built

### 1. useDuelSocket React Hook
Client-side bridge to /duel namespace with complete API:

**Connection lifecycle:**
- Auto-connect to /duel namespace on mount
- Track connection state (isConnected)
- Auto-reconnect on disconnect (Socket.IO built-in)
- Clean disconnect on unmount

**Action methods (7):**
- `joinLobby(classroomId)` - Join classroom lobby
- `leaveLobby(classroomId)` - Leave classroom lobby
- `createChallenge(opponentId, lessonId, classroomId)` - Create duel
- `acceptChallenge(duelId)` - Accept duel
- `declineChallenge(duelId)` - Decline duel
- `cancelChallenge(duelId)` - Cancel duel
- `submitScore(duelId, wordsFound)` - Submit async duel score

**Event listeners (7):**
- `onChallengeReceived` - Opponent sent challenge
- `onLobbyUpdate` - Opponent joined/left lobby
- `onDuelAccepted` - Duel started
- `onDuelDeclined` - Duel declined
- `onDuelCompleted` - Duel finished
- `onScoreSubmitted` - Opponent submitted score
- `onError` - Server error occurred

**Key features:**
- Cleanup pattern: Each on* method returns unsubscribe function
- Null socket handling: Methods no-op when socket unavailable
- 25 test cases: Connection, actions, listeners, edge cases

### 2. Lobby Handlers
Server-side opponent presence system:

**Join lobby flow:**
1. Validate classroomId (Zod UUID check)
2. Join Socket.IO room `duel:lobby:${classroomId}`
3. Add to in-memory tracking Map
4. Query pending duels for student
5. Emit `lobby-state` to joiner (opponents + pending challenges)
6. Broadcast `lobby-update` to room (new opponent list)

**Leave lobby flow:**
1. Validate classroomId
2. Leave Socket.IO room
3. Remove from tracking Map
4. Broadcast `lobby-update` to room

**Disconnect flow:**
1. Remove from all lobbies
2. Broadcast `lobby-update` to affected rooms
3. Clean up tracking Maps

**Data structures:**
```typescript
// Module-level state
lobbies: Map<classroomId, Map<userId, OpponentInfo>>
userLobbyMembership: Map<userId, Set<classroomId>>
```

**Test coverage:** 14 test cases covering join, leave, disconnect, validation

### 3. Handler Registry Wiring
Unified entry point for /duel namespace:

**Before (plan 38-03):** Stub handlers with console.log
**After (plan 38-04):** Modular handler composition

```typescript
export function registerDuelHandlers(namespace, socket) {
  registerLifecycleHandlers(namespace, socket);  // create, accept, decline, cancel
  registerLobbyHandlers(namespace, socket);      // join, leave, disconnect
  // TODO Phase 39: registerGameplayHandlers(namespace, socket);
}
```

**Benefits:**
- Separation of concerns (lifecycle / lobby / gameplay)
- Testable in isolation
- Easy to extend (Phase 39 gameplay)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed translation keys in ActiveGamesIndicator**
- **Found during:** Initial commit attempt
- **Issue:** Component used `education.teacher.*` keys, translations defined at `teacher.teacher.*`
- **Fix:** Changed component to use correct path
- **Files modified:** `fe-next/components/education/ActiveGamesIndicator.tsx`
- **Commit:** 098b662e

**2. [Rule 2 - Missing Critical] Added eslint disable for ref cleanup**
- **Found during:** Lint check
- **Issue:** False positive warning about listenersRef.current in cleanup
- **Fix:** Added eslint-disable comment (ref intentionally used for cleanup)
- **Files modified:** `fe-next/hooks/useDuelSocket.ts`
- **Commit:** 439e615c

**3. [Rule 1 - Bug] Fixed getPendingDuelsForStudent return type**
- **Found during:** TypeScript compilation
- **Issue:** Function returns `{ data, error }` not just array
- **Fix:** Destructure result and check error before using data
- **Files modified:** `fe-next/backend/handlers/duel/lobby.ts`
- **Commit:** 439e615c

None of these required architectural decisions - all were implementation fixes.

## Testing

**Frontend tests (useDuelSocket):**
```bash
npx jest --testPathPattern="useDuelSocket" --no-coverage
```
- 25 tests passed
- Coverage: Connection lifecycle, action methods, event listeners, edge cases

**Backend tests (lobby handlers):**
```bash
npm run test:backend -- --testPathPattern="duel/__tests__/lobby"
```
- 14 tests passed
- Coverage: Join, leave, disconnect, validation, multi-user scenarios

**Lint:**
```bash
npm run lint
```
- Clean (no errors, 0 warnings)

## What's Next

**Immediate next steps (Plan 38-05 - Full Duel Flow Integration):**
1. Create AsyncDuelLobby UI component
2. Wire useDuelSocket to component
3. Display opponent list from lobby-update events
4. Handle challenge creation from UI
5. Test full flow: join lobby → see opponents → create challenge → receive notification

**Future phases:**
- Phase 39: Real-time duels (gameplay handlers, live word submission)

## Key Learnings

1. **React hooks for WebSocket:** Cleanup pattern (return unsubscribe function) integrates cleanly with useEffect
2. **In-memory state suffices:** For single-server deployment, Map-based tracking is simple and fast
3. **Event granularity matters:** Separate lobby-state (full sync) from lobby-update (delta) reduces bandwidth
4. **Zod validation catches bugs:** UUID validation caught test bugs early (invalid UUIDs)

## Commits

- `098b662e` - fix(38-04): correct translation keys in ActiveGamesIndicator
- `439e615c` - feat(38-04): add lobby handlers and wire handler registry

**Total:** 2 commits, 16 minutes
