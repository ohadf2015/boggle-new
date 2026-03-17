# Comprehensive QA Audit — 2026-03-17

## Audit Team (5 Agents)
1. **Frontend Components** — error boundaries, a11y, React anti-patterns, i18n
2. **Backend & API** — input validation, auth, security, race conditions
3. **Test Coverage** — gaps, anti-patterns, weak tests
4. **State Management** — Zustand, contexts, Socket.IO, client-server sync
5. **Performance & Build** — large files, lazy loading, N+1 queries, memory leaks

## Summary: 85 Issues Found

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| HIGH | 28 |
| MEDIUM | 28 |
| LOW | 19 |

---

## CRITICAL Issues

### Security
| # | Issue | File |
|---|-------|------|
| C-1 | Client controls gold value in adventure purchase API | `api/adventure/purchase/route.ts` |
| C-2 | Client controls gold earned on level completion | `api/adventure/complete/route.ts:224` |
| C-3 | No payload validation on `getWordsForBoard` socket handler | `gameLifecycleHandler.ts:213` |
| C-4 | Timing-unsafe cron secret comparison (use `crypto.timingSafeEqual`) | `api/cron/select-daily-words/route.ts:37` |

### Stability
| # | Issue | File |
|---|-------|------|
| C-5 | No error boundaries on any major game mode view | `BlastView`, `SinglePlayerView`, `ResultsPage`, `MultiplayerInGameView` |

### Coverage
| # | Issue | File |
|---|-------|------|
| C-6 | Zero tests on `ResultsPage`, `MultiplayerInGameView`, `MultiplayerLobbyView` | core MP surfaces |
| C-7 | `gameStartCoordinator` — documented race condition + zero tests | `backend/utils/gameStartCoordinator.ts` |
| C-8 | `connectionHandler` — reconnection logic, zero tests | `backend/handlers/connectionHandler.ts` |

### Performance
| # | Issue | File |
|---|-------|------|
| C-9 | `useBlastGame.ts` still 1040 lines (500 max) | `hooks/useBlastGame.ts` |
| C-10 | `useAdventureGame.ts` well over 500 lines | `hooks/useAdventureGame.ts` |

---

## HIGH Issues (28)

### Backend Security
- H-1: No rate limiting on `adventure/complete` — gold/XP farming
- H-2: No rate limiting + no upgrade validation on `adventure/purchase`
- H-3: `custom-puzzle/submit` — unbounded arrays to DB
- H-4: `single-player/vote` — language not validated against enum
- H-5: Grace period lock not released on catch path (`wordHandler.ts:375`)
- H-6: In-memory rate limiter not shared across Railway instances
- H-7: `blast/result` — score/stats trusted from client

### State Management
- H-8: `GameStateContext` subscribes to entire Zustand store (re-renders every timer tick)
- H-9: `useSafeSocketEvent` — brief listener gap when events array changes
- H-10: Dual timer state (Zustand + local component state) causing sync divergence
- H-11: `useGameActions` violates rules-of-hooks naming convention

### Frontend
- H-12: `CreateRoomModal` / `JoinRoomModal` — labels not associated with inputs
- H-13: 23 components with suppressed `exhaustive-deps` (stale closure risk)
- H-14: Hardcoded 'Host' string in `MultiplayerLobbyView` (i18n violation)
- H-15: `RoomListView` — no empty state when rooms list empty

### Performance
- H-16: Remotion (400-600KB) potentially leaking to non-adventure pages
- H-17: Howler (~50KB) loaded on every page via Header
- H-18: N+1 DB in `blast/result` — SELECT then UPDATE profile
- H-19: N+1 DB in `adventure/complete` — 4-5 sequential DB calls (40-150ms)
- H-20: Unused `million` package in prod deps
- H-21: Sync `require()` for dictionary loading blocks cold start 100-300ms
- H-22: `DailyChallengeResults.tsx` (885 lines, no memo)
- H-23: `MiniGrid.tsx` (819 lines, no memo)

### Coverage
- H-24: 13 backend handlers with zero tests
- H-25: 13+ API routes with zero tests
- H-26: `coinManager.ts` — coin formula in 5 places, zero tests
- H-27: `useSafeSocketEvent.ts` — cross-cutting hook, zero tests
- H-28: `selectors.ts` — all derived game state, zero tests

---

## Tests Created (473 new tests across 17 files)

### Sprint 1 (206 tests)

| File | Tests | Domain |
|------|-------|--------|
| `hooks/__tests__/useSafeSocketEvent.test.ts` | 25 | Socket event subscription lifecycle |
| `utils/__tests__/coinManager.test.ts` | 39 | Coin reward formulas, streak caps, combo milestones |
| `hooks/gameState/__tests__/selectors.test.ts` | 31 | All selectors, store reactivity, useGameActions caching |
| `backend/utils/__tests__/gameStartCoordinator.test.ts` | 40 | ACK sequence, race conditions, timeouts, retries |
| `backend/handlers/__tests__/connectionHandler.test.ts` | 25 | Disconnect/reconnect, host transfer, timeout cleanup |
| `app/api/adventure/complete/__tests__/route.test.ts` | 26 | Auth, validation, XP calc, gold security vuln |
| `app/api/adventure/purchase/__tests__/route.test.ts` | 20 | Auth, validation, gold manipulation vulnerability |

### Sprint 2 (120 tests)

| File | Tests | Domain |
|------|-------|--------|
| `backend/utils/__tests__/timerManager.test.ts` | 27 | Timer lifecycle, deprecated API leak, cleanup |
| `backend/handlers/__tests__/hostHandler.test.ts` | 10 | keepAlive, reactivation, permission checks |
| `app/api/blast/result/__tests__/route.test.ts` | 31 | Score trust vuln, personal bests, N+1 DB pattern |
| `app/api/validate-word/__tests__/route.test.ts` | 23 | Input validation, language enum bug, community words |
| `utils/__tests__/wordPathFinder.test.ts` | 29 | Grid traversal, adjacency, no-reuse, multi-grid sizes |

### Sprint 3 (148 tests)

| File | Tests | Domain |
|------|-------|--------|
| `backend/modules/__tests__/gameStateManager.test.ts` | 45 | Game creation, state transitions, player/host mgmt |
| `backend/modules/__tests__/spectatorManager.test.ts` | 29 | Spectator lifecycle, upgrade race condition |
| `backend/handlers/__tests__/friendsHandler.test.ts` | 33 | Social graph, auth, rate limiting |
| `app/api/engagement/prestige/__tests__/route.test.ts` | 25 | Prestige state machine, reward tiers, race condition |
| `app/api/cron/select-daily-words/__tests__/route.test.ts` | 16 | Cron auth, edge function calls |

### Run commands
```bash
# Frontend tests (all 10 suites — 264 tests)
npm test -- hooks/__tests__/useSafeSocketEvent.test.ts utils/__tests__/coinManager.test.ts hooks/gameState/__tests__/selectors.test.ts app/api/adventure/complete/__tests__/route.test.ts app/api/adventure/purchase/__tests__/route.test.ts app/api/blast/result/__tests__/route.test.ts app/api/validate-word/__tests__/route.test.ts app/api/engagement/prestige/__tests__/route.test.ts app/api/cron/select-daily-words/__tests__/route.test.ts utils/__tests__/wordPathFinder.test.ts

# Backend tests (all 7 suites — 209 tests)
npm run test:backend -- backend/utils/__tests__/gameStartCoordinator.test.ts backend/handlers/__tests__/connectionHandler.test.ts backend/utils/__tests__/timerManager.test.ts backend/handlers/__tests__/hostHandler.test.ts backend/handlers/__tests__/friendsHandler.test.ts backend/modules/__tests__/gameStateManager.test.ts backend/modules/__tests__/spectatorManager.test.ts
```

---

## Security Fixes Applied

### C-1 FIXED: Adventure purchase gold exploit
- Server now accepts only `{ upgradeId }`, fetches gold from DB, validates via `purchaseUpgrade()`, includes optimistic locking
- File: `app/api/adventure/purchase/route.ts`

### C-2 FIXED: Adventure complete gold exploit
- Gold calculated server-side: `10 * stars + perfectBonus + upgradeBonus`, capped at 500/level
- `clientGoldEarned` parameter removed entirely
- File: `app/api/adventure/complete/route.ts`

### C-3 FIXED: getWordsForBoard payload validation
- Added `validatePayload(getWordsForBoardSchema, data)` — validates language enum + boardSize 3-10
- File: `backend/handlers/gameLifecycleHandler.ts`

### C-4 FIXED: Timing-unsafe cron secret comparison
- Replaced `!==` with `crypto.timingSafeEqual` in 2 cron routes
- Files: `api/cron/select-daily-words/route.ts`, `api/cron/calculate-bot-difficulty/route.ts`

### H-1/H-2 FIXED: Rate limiting added
- `adventure/complete`: 10 req/min
- `adventure/purchase`: 10 req/min
- `blast/result`: 20 req/min
- `engagement/prestige`: 3 req/min

---

## Remaining Fix Priority

### Next Sprint — Stability
5. Wrap all game mode views in `FeatureErrorBoundary`
6. Fix `useSafeSocketEvent` listener gap
7. Resolve dual timer state (Zustand vs local)

### Sprint 3 — Performance
8. Split `useBlastGame.ts` and `useAdventureGame.ts` under 500 lines
9. Lazy-load Howler (not in root layout Header)
10. Collapse N+1 DB calls in adventure/complete
11. Remove unused `million` package

### Sprint 4 — Quality
12. Add memo to `DailyChallengeResults`, `MiniGrid`
13. Fix label/input association in modals
14. i18n: replace hardcoded 'Host' string
15. Add empty states to `RoomListView`, `ResultsPage`
