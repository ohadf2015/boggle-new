# Multiplayer Comprehensive Audit — LexiClash
**Date:** 2026-03-15
**Agents:** Connection Auditor, Performance Auditor, UX Auditor, Best Practices Researcher

---

## Executive Summary

4 expert agents audited the multiplayer system across connectivity, performance, UX, and industry best practices. Total findings: **45 issues** (5 CRITICAL, 12 HIGH, 16 MEDIUM, 12 LOW).

The system is architecturally sound — Socket.IO Connection State Recovery is enabled, the GameStartCoordinator ACK pattern is well-designed, game state lives server-side with Redis persistence, and Zustand selectors are properly structured. However, significant gaps exist in AFK enforcement, connection feedback UX, broadcast efficiency, and player-facing multiplayer states.

---

## Unified Priority Matrix

### CRITICAL (fix first — data corruption or broken core flow)

| # | Issue | Domain | File | Fix Effort |
|---|-------|--------|------|------------|
| **CR-1** | Timer can start twice — ACK path and timeout callback race | Connection | `gameStartHandler.ts:316-318` | 5 min |
| **CR-2** | `io.emit('activeRooms')` in cleanup broadcasts to ALL sockets, not lobby | Performance | `socketSetup.ts:148` | 2 min |
| **CR-3** | `wordHuntLifeUpdate` broadcasts every 1s tick even when nothing changed | Performance | `gameTimer.ts:78-98` | 5 min |
| **CR-4** | Player has no lobby waiting state after joining | UX | `PlayerView` | 2-3 hrs |
| **CR-5** | AFK is invisible to the affected player and to opponents | UX | `GameLeaderboard`, `PresenceIndicator` | 2-3 hrs |

### HIGH (fix soon — significant bugs, security, or UX pain)

| # | Issue | Domain | File | Fix Effort |
|---|-------|--------|------|------------|
| **HI-1** | Reconnection timeout not cancelled on voluntary `leaveRoom` | Connection | `playerJoinHandler.ts:259-281` | 15 min |
| **HI-2** | `upgradeToPlayer` during in-progress skips `initializePlayerData` | Connection | `playerJoinHandler.ts:368-370` | 30 min |
| **HI-3** | Client session max age (5min) misaligned with server grace period (2min) | Connection | `useMultiplayerSession.ts:268-275` | 5 min |
| **HI-4** | `playerWords` duplicate check is O(n) array scan | Performance | `scoreManager.ts:94,139` | 30 min |
| **HI-5** | 3 `dynamic import()` in hot `startGame` handler | Performance | `gameStartHandler.ts:195,219,266,277` | 10 min |
| **HI-6** | Double `wordHuntLifeUpdate` — handler + timer tick overlap | Performance | `wordHandler.ts:604` + `gameTimer.ts:95` | 15 min |
| **HI-7** | `updatePlayer` creates new array on every leaderboard update (5x/sec) | Performance | `store.ts:126` | 20 min |
| **HI-8** | Join spinner has no timeout or failure recovery | UX | Join modal | 30 min |
| **HI-9** | `ConnectionBanner` exists but unused during active game | UX | `PageClient.tsx` | 1 hr |
| **HI-10** | Rematch flow is host-only and undiscoverable by players | UX | `ResultsPage` | 2 hrs |
| **HI-11** | Chat is desktop-only (`hidden lg:block`) during gameplay | UX | Layout components | 3 hrs |
| **HI-12** | Invalid `role="listbox"` with `role="option"` on buttons | A11Y | `RoomListView` | 15 min |

### MEDIUM

| # | Issue | Domain | Fix Effort |
|---|-------|--------|------------|
| **ME-1** | AFK health check logs but never acts — idle players can't be evicted | Connection | 2 hrs |
| **ME-2** | Reconnect `join` sent without auth context — identity not re-validated | Connection | 1 hr |
| **ME-3** | `migrating` flag cleanup via timer instead of disconnect handler | Connection | 15 min |
| **ME-4** | `broadcastActiveRooms` on every join/leave — O(N) per event | Performance | 30 min |
| **ME-5** | `migrationTimeout` memory leak — never cleared on happy path | Performance | 10 min |
| **ME-6** | `findAllWords` board solver called twice in word-hunt start | Performance | 30 min |
| **ME-7** | `presenceHeartbeat` has no rate limit | Performance | 5 min |
| **ME-8** | Health check iterates all games/users every 30s, does nothing | Performance | 5 min |
| **ME-9** | `updateGame` called every timer tick even when unchanged | Performance | 2 min |
| **ME-10** | Room list shows no game mode indicator | UX | 2 hrs |
| **ME-11** | Spectator upgrade state not shown (pending/accepted) | UX | 1 hr |
| **ME-12** | No score delta animation for opponent scoring | UX | 2 hrs |
| **ME-13** | Mobile leaderboard 120px truncation with no scroll affordance | UX | 30 min |
| **ME-14** | Presence indicators host-only — information asymmetry | UX | 15 min |
| **ME-15** | Spectator banner `role="alert"` + `aria-live="polite"` contradictory | A11Y | 5 min |
| **ME-16** | Results collapsible sections missing `aria-controls` | A11Y | 15 min |

### LOW

| # | Issue | Domain |
|---|-------|--------|
| **LO-1** | `hostReconnectionTimeout` stored via `as any` cast | Connection |
| **LO-2** | `leaveRoom` takes `gameCode` from client payload | Connection |
| **LO-3** | Stale health check logs at debug level — invisible in prod | Connection |
| **LO-4** | `useGameActions()` module-level cache breaks HMR | Performance |
| **LO-5** | `useSocketEvent` handler excluded from deps — stale closures | Performance |
| **LO-6** | `playerReconnected` broadcasts full `updateUsers` unnecessarily | Performance |
| **LO-7** | Quick Play hardcoded English toast string | UX/i18n |
| **LO-8** | Back link not locale-aware (`href="/"`) | UX |
| **LO-9** | English-only ordinal suffixes in rank display | UX/i18n |
| **LO-10** | Exit warning lacks consequence text | UX |
| **LO-11** | Chat bubble alignment broken in RTL | UX |
| **LO-12** | "Me" badge in leaderboard visual-only (no SR text) | A11Y |

---

## Sprint Plan

### Sprint 1 — Quick Wins (1-2 days, no new UI)

**Backend fixes (all < 15 min each):**
1. **CR-1**: Guard `setAcknowledgmentTimeout` callback with `sequence.timerStarted` check
2. **CR-2**: Replace `io.emit('activeRooms')` with `broadcastActiveRooms(io, getActiveRooms())` + guard with `if (cleaned > 0)`
3. **CR-3**: Add `livesChanged` guard around `wordHuntLifeUpdate` broadcast
4. **HI-1**: Cancel reconnection timeout in `leaveRoom` handler
5. **HI-3**: Align client session max age with `PLAYER_RECONNECTION_GRACE_PERIOD` (120s)
6. **HI-5**: Move dynamic imports to static top-level imports in `gameStartHandler`
7. **ME-7**: Add `checkRateLimit()` to `presenceHeartbeat` and `presenceUpdate`
8. **ME-8**: Remove dead health-check loop or implement actual enforcement
9. **ME-9**: Guard `updateGame` with `if (secondChanged)` in timer

**Frontend fixes:**
10. **HI-8**: Add 12s timeout to join spinner with retry option
11. **HI-12**: Fix `role="listbox"` → `role="list"` in `RoomListView`
12. **ME-15**: Fix spectator banner ARIA contradiction
13. **ME-16**: Add `aria-controls` to results collapsibles
14. **LO-7**: Move Quick Play toast to i18n key

### Sprint 2 — Player Experience + AFK (2-3 days)

1. **CR-4**: Build player lobby waiting state ("Waiting for host to start", player list, share link)
2. **CR-5 + ME-14**: Show presence indicators for ALL players, not just host view
3. **ME-1**: Implement AFK enforcement (warning at 60s → overlay at 90s → spectator at 120s in lobby; input-based during rounds)
4. **HI-4**: Replace `playerWords` array scan with parallel `Set<string>` for O(1) lookup
5. **HI-6**: Prevent double `wordHuntLifeUpdate` by tracking `lastLifeUpdateAt`
6. **HI-7**: Add shallow equality check before `setLeaderboard` + optimize `updatePlayer`

### Sprint 3 — Connection Recovery + Post-Game (2-3 days)

1. **HI-9**: Wire `ConnectionBanner` during active game with contextual messaging ("Your score is saved")
2. **HI-10**: Add rematch clarity — "Waiting for host" banner + vote/suggest rematch button
3. **HI-2**: Guard `upgradeToPlayer` — call `initializePlayerData` for mid-game upgrades
4. **ME-2**: Include auth context in reconnect `join` emission
5. **ME-3 + ME-5**: Clear `migrationTimeout` in disconnect handler
6. **ME-11**: Add spectator upgrade pending state UI

### Sprint 4 — Enhancements (3-4 days)

1. **HI-11**: Mobile chat FAB/drawer with unread badge
2. **ME-10**: Game mode badges on room list cards (requires `ActiveRoom` type change)
3. **ME-12**: Score delta animation (+N floating number, row flash)
4. **ME-6**: Cache `findAllWords` result to avoid double board solve
5. **ME-13**: Fix mobile leaderboard truncation (scroll affordance or expandable)
6. **ME-4**: Throttle/debounce `broadcastActiveRooms` calls

---

## Best Practices Alignment

Based on industry research (see `docs/research/multiplayer-best-practices.md`):

| Best Practice | Current Status | Gap |
|---|---|---|
| Connection State Recovery (Socket.IO 4.6+) | Enabled (2min window) | Aligned |
| Exponential backoff reconnection | Socket.IO default | Aligned |
| Reconnection jitter (`randomizationFactor`) | Default 0.5 | Aligned |
| Authoritative server (server validates all words) | Yes | Aligned |
| AFK detection (hybrid input + heartbeat) | Heartbeat exists, no enforcement | Gap |
| AFK warning-to-kick flow | Missing entirely | Gap |
| Host is UI role only, not authority | Mostly — game state is server-side | Aligned |
| Host migration with brief pause | Immediate transfer, 30s grace period | Aligned |
| Idempotent events with UUID nonces | Not implemented | Gap |
| Connection quality indicator (3-tier) | Only `ConnectionDot` (binary) | Gap |
| Player presence indicators (opacity/badges) | Host-only | Gap |
| Animation padding to mask latency | "Checking" spinner exists, no minimum time | Partial |
| Delta compression for state updates | Full state on leaderboard updates | Gap |
| Never block UI during reconnection | ConnectionDot is non-blocking | Aligned |
| Never pause game for one disconnect | Correct — game continues | Aligned |
| Redis session locking (split-brain prevention) | Not implemented | Gap (scale concern) |

---

## Architecture Strengths

- **GameStartCoordinator** ACK/retry (100/200/400/800ms backoff) is well-designed
- **State machine** (`gameStateMachine.ts`) prevents invalid transitions with self-healing
- **Redis persistence** with `restoreGameFromRedis()` on join — survives server restarts
- **Multi-tab detection** via `authUserId` mapping with clean socket takeover
- **Room-scoped broadcasts** via Socket.IO rooms — no global state leakage
- **Zustand `subscribeWithSelector`** middleware — correct React integration

---

## Files Referenced

### Backend (most impacted)
- `backend/handlers/gameStartHandler.ts` — CR-1, HI-5, ME-6
- `backend/handlers/playerJoinHandler.ts` — HI-1, HI-2, ME-2, ME-3, ME-5
- `backend/handlers/connectionHandler.ts` — LO-1
- `backend/handlers/presenceHandler.ts` — ME-1, ME-7, ME-8
- `backend/handlers/wordHandler.ts` — HI-6
- `backend/modules/scoreManager.ts` — HI-4
- `backend/services/gameLifecycle/gameTimer.ts` — CR-3, HI-6, ME-9
- `server/socketSetup.ts` — CR-2

### Frontend (most impacted)
- `hooks/useMultiplayerSocket.ts` — ME-2
- `hooks/useMultiplayerSession.ts` — HI-3
- `hooks/gameState/store.ts` — HI-7
- `components/multiplayer/RoomListView.tsx` — HI-12, ME-10
- `components/multiplayer/GameLeaderboard.tsx` — CR-5, ME-14
- `components/multiplayer/PresenceIndicator.tsx` — CR-5
- `components/multiplayer/SpectatorBanner.tsx` — ME-11, ME-15
- `player/components/PlayerView.tsx` — CR-4
