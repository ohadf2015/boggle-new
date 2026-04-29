# Multiplayer Performance Audit — 2026-04-29

**Scope:** Server-side (Express + Socket.IO + Supabase + Redis) and client-side (React + Next.js 16) MP code paths. Focus: hot-path CPU, broadcast fan-out, render churn, memory leaks across rematches.

**Methodology:** Two parallel sub-agent passes (server lens + client lens), then per-finding source verification before any code change. Several findings collapsed under verification — documented below.

---

## Shipped this session

### CLIENT-T1 — WheelRushView 100ms parent ticker → leaf-isolated countdown

**File:** `components/multiplayer/WheelRushView.tsx`
**Severity (before):** MED — parent re-rendered every 100ms, dragging the full leaderboard tree (~10 entries) through reconcile @ 10 Hz.
**Fix:**
- Removed `now` state + 100ms `setInterval` on parent.
- Replaced with `setTimeout(remaining)` that flips `fogActive` → `false` exactly once at fog expiry.
- Extracted `<FogCountdown endsAt={...}>` leaf component; it owns its own 250ms tick for the seconds display only. Slowed tick from 100ms → 250ms (visually indistinguishable for "8s, 7s, …" text).

**Why this works:** `now` was only consumed by `fogActive` (boolean that transitions once) and the seconds text inside the fog banner. Those two consumers have different render frequencies — separating them collapses the parent re-render rate from 10 Hz to ~0 Hz during fog.

**Test:** `components/multiplayer/__tests__/WheelRushView.test.tsx` — added "unmasks opponent scores after fog window expires" using `vi.useFakeTimers()` + `vi.setSystemTime` + `vi.advanceTimersByTime(WHEEL_RUSH_FOG_MS + 500)`. Passes on both old and new impl (regression net for behavior preservation). 10/10 file tests, 135/135 multiplayer suite green.

---

## Findings dropped after source verification

### H1 — "Trie scanned twice per word" (sub-agent claim)

**Verdict:** False. Sub-agent confused two different operations.
- `wordHandler.ts:293` — `isWordOnBoardAsync(word, letterGrid, letterPositions)` runs **path traversal** on the active letter grid via worker pool. Not a trie scan.
- `wordHandler.ts:337` — `isValidWordCached(word, lang)` is a **Redis-backed dictionary lookup** with in-memory fallback (`isDictionaryWord`).

These are non-redundant: one answers "is this word reachable on this board?", the other answers "is this string a real word in language L?". Cannot merge.

### H4 — "savePlayerWord blocks event loop" (sub-agent claim)

**Verdict:** False. `wordValidationHandler.ts:233-241` is genuinely fire-and-forget:
```ts
savePlayerWord({ ... }).catch((err: Error) => { logger.debug(...) });
```
No `await`. The `.catch()` attaches a rejection handler to an unawaited promise; it does not block the surrounding handler. Event loop is free to continue.

(There is a separate latent concern about Supabase connection-pool back-pressure under sustained high WPS — flagged as future work, not a hot-path bug.)

---

## Deferred to follow-up

### H3 — Leaderboard delta broadcast

**Real finding.** `wordValidationHandler.ts` broadcasts full player array (~2-3 KB) on every word at ~10 wps. At 8 players × 100 rooms = 320-640 KB/s server egress.

**Why deferred:** Wire-format change touches 4 MP modes (wheel-rush, blast, WordHunt, standard) plus client merge logic plus back-compat for in-flight clients. Bundling into a perf sprint = scope creep. Needs its own audit doc + staged rollout (server emits delta + full sync, clients migrate, then drop full broadcast).

### Other open items from sub-agent reports (still real, lower priority)

| ID | File | Issue | Owner |
|----|------|-------|-------|
| S-M1 | `scoringEngine.ts:118-145` | Rarity recomputed per word on game-end; O(words × players) | open |
| S-M2 | `wordValidationHandler.ts:134-142` | Blast: full grid+tileStates per word; should send delta `{clearedPath, movedFrom, movedTo}` | open |
| S-M3 | `middleware/rateLimiterRedis.ts:97-109` | Redis round-trip per action; consider local sliding window + write-behind | open |
| S-M4 | `services/gameLifecycle/gameResults.ts` | `incrementWordApproval` N+1 INCR; collapse to one HMSET | open |
| S-M5 | `gameStateManager.ts:84-87` | `gameCache` TTL 30 min × max 200 — verify memory ceiling | open |
| S-M6 | `shared/schemas/socketSchemas.ts` | Verify wheel-rush `gameMode` registered (carries from 04-28 audit) | open |
| C-M1 | `MultiplayerInGameView.tsx:238-245` | 9 store hooks at root; push mode-specific subscriptions into their own components | open |
| C-M2 | `WheelRushView.tsx:5` | Full `framer-motion` import; wrap in `LazyMotion(domAnimation)` | open (perf-profile-2026-04-22) |
| C-M3 | `WheelRushView.tsx:368-420` | Pulse/shake without `useReducedMotion()` guard | open |
| C-M4 | `WheelRushView.tsx:303` | `getBoundingClientRect()` in undebounced resize handler | open |
| C-M5 | `WheelRushView.tsx:187-200` | `socket.on('connect', onReconnect)` not `off`'d in cleanup | open (HIGH) |
| C-M6 | `MultiplayerInGameView.tsx:26` | `BlastGame` (528 lines) imported eagerly though branch-rendered | open |

C-M5 is HIGH severity — will cause stale handler firing on rematch. Recommend addressing in next perf cycle or a small standalone fix.

---

## Lessons

1. **Sub-agent finding ≠ verified bug.** Two of four "H-class" findings were wrong at the source. Always verify line ranges and intended semantics before refactoring.
2. **Wire-format changes are perf sprint kryptonite.** Even when correct (H3 is real), they belong in their own session with explicit back-compat plan.
3. **Parent re-renders from a high-frequency ticker is the textbook React leak.** Two consumers, two render frequencies → split into leaf components.

---

## What changed (one line)

- `components/multiplayer/WheelRushView.tsx`: `now`-state polling replaced with `setTimeout` + `<FogCountdown>` leaf
- `components/multiplayer/__tests__/WheelRushView.test.tsx`: added fog-expiry regression test
