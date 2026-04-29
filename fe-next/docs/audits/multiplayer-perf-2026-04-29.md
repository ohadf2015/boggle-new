# Multiplayer Performance Audit — 2026-04-29

**Scope:** Server-side (Express + Socket.IO + Supabase + Redis) and client-side (React + Next.js 16) MP code paths. Focus: hot-path CPU, broadcast fan-out, render churn, memory leaks across rematches.

**Methodology:** Two parallel sub-agent passes (server lens + client lens), then per-finding source verification before any code change. Several findings collapsed under verification — documented below.

---

## Shipped this session

### CLIENT-T6 — Lift mode-overlay store subscriptions into InGameScreen

**Files:** `components/game/InGameScreen.tsx`, `components/game/in-game/types.ts`, `components/multiplayer/MultiplayerInGameView.tsx`, `player/components/PlayerInGameView.tsx`, `host/components/HostInGameView.tsx`
**Severity (before):** MED — `MultiplayerInGameView`, `PlayerInGameView`, and `HostInGameView` each subscribed to 7 Zustand store hooks (`useBlastTileOverlay`, `useWordHuntTargetLength`, `useWordHuntMyLife`, `useWordHuntTargetAttempts`, `useWordHuntTargetFound`, `useWordHuntPlayerLives`, `useWordHuntEliminatedPlayers`) and prop-passed all 7 values into `InGameScreen`. The three parents only ever consumed `gameMode` directly; the 7 mode-overlay hooks were pure pass-throughs. Net effect: every word-hunt/blast tick re-rendered all three parents even when their `gameMode` wasn't `classic` (and the values would be ignored at the early-return for wheel-rush/blast/word-hunt branches). Audit C-M1 originally framed as "9 hooks at root" — verified count is 7 mode-overlay hooks (plus `gameMode` and `useGameStore` selectors that legitimately stay at root).
**Fix:** Read the 7 values directly inside `InGameScreen` (only place they're consumed). Remove the 7 prop fields from `InGameScreenProps`. Remove the 7 hook subscriptions and the 7 prop pass-throughs from all three parents.

**Why this works:** Zustand's `useStore`-style hooks subscribe selectively per-component. Moving subscriptions to the leaf where data is consumed means the leaf re-renders on those updates (correct), but the parents only re-render on what they actually read (`gameMode` and other genuinely shared state). For non-classic modes, `InGameScreen` doesn't render at all (parents take an earlier `return` branch), so even the leaf is paid only when the data matters.

**Test surface:** No existing tests for `InGameScreen`, `MultiplayerInGameView`, `PlayerInGameView`, or `HostInGameView`. Regression net = `npm run build:fast` (clean type-check + bundle), full multiplayer test suite (138/138 green). Two unrelated `RoomListView.tutorial-persistence` test failures isolated to the user's parallel translation WIP — reproduce on clean HEAD with translation WIP applied alone, do not reproduce with this refactor's 5 files alone.

**Note on audit-vs-reality:** Audit said "9 hooks", real count is 7 mode-overlay + 1 gameMode + 1 unrelated `useOpponentWordFeed` (separate concern). Audit also didn't flag `HostInGameView` or `PlayerInGameView` despite identical pattern — caught during build:fast type check (compile error pointed to HostInGameView still passing dropped props).

### CLIENT-T5 — Mode-specific game views code-split via next/dynamic

**File:** `components/multiplayer/MultiplayerInGameView.tsx`
**Severity (before):** MED — `BlastGame` (528 lines), `WordHuntGame` (308 lines), and `WheelRushView` (~575 lines) were all eagerly imported into the MP route bundle, even though only one of them ever renders at a time (mode-conditional render at lines 290/325/345). A standard MP room paid the bytes for every other mode's view + its dependencies (Pixi for wheel-rush, blast-specific tile state, word-hunt life system).
**Fix:** Replaced all three eager imports with `next/dynamic` + `ssr: false`:
```ts
const BlastGame = dynamic(() => import('@/components/blast/BlastGame').then(m => m.BlastGame), { ssr: false });
const WordHuntGame = dynamic(() => import('@/components/wordhunt/WordHuntGame').then(m => m.WordHuntGame), { ssr: false });
const WheelRushView = dynamic(() => import('@/components/multiplayer/WheelRushView').then(m => m.WheelRushView), { ssr: false });
```

**Why ssr:false is safe here:** Each view uses client-only hooks (sockets, sound effects, `framer-motion`'s `useReducedMotion`, etc.), and `MultiplayerInGameView` itself runs only client-side via Zustand store hooks.

**Why `useBlastMultiplayerBridge` stays eager:** The hook is called unconditionally at the top of the component (line 256). Conditional hooks violate rules-of-hooks. The bridge file is small (49 lines) and its imports are likely shared with BlastGame's chunk anyway; lazy-loading it would require structural rework outside this session's scope.

**Verification:** No test file exists for `MultiplayerInGameView`, so behavioral regression is checked via the broader multiplayer suite (138/138 green) plus a clean `npm run build:fast` (47s, dynamic chunks compile correctly). Type errors in `host/HostView.tsx:396` (pre-existing user WIP, unrelated) noted but not fixed in this session.

**Trade-off:** Each mode now shows a brief loading state (default ~50–200ms, network-dependent) on first render of that mode. Acceptable for game routes where the user has just transitioned from matchmaking. If this becomes a UX issue, replace `{ ssr: false }` with `{ ssr: false, loading: () => <ModeLoadingPlaceholder /> }`.

### CLIENT-T4 — WheelRushView responsive wheel: window-resize → ResizeObserver

**File:** `components/multiplayer/WheelRushView.tsx`
**Severity (before):** MED — `window.addEventListener('resize', ...)` fired on every browser resize event with no debounce, each call triggering `getBoundingClientRect()` (forced layout) + `setWheelRadius(...)` (re-render). Rapid resize (orientation change, devtools toggle, snap-resize on macOS) caused layout thrash.
**Fix:** Replaced window resize listener with `ResizeObserver` observing the wheel container directly. Browser batches RO callbacks per-frame, so rapid resizes coalesce into at most one update per frame. Also more targeted — only fires when *this element* resizes, not on every window resize event regardless of impact.

**Why this is better than debouncing window resize:**
1. ResizeObserver is per-frame batched at the browser level (no JS-level throttle needed).
2. Observes the actual element of interest — irrelevant resizes (e.g., a side panel resizing) don't fire the callback.
3. Catches container resizes from CSS reflow even when the window itself doesn't change.

**Test:** Added "observes the wheel container with ResizeObserver instead of window resize". Replaces `global.ResizeObserver` with a tracked stub for the test scope, asserts constructor and `observe()` were both called with an `Element`. RED on previous code (no RO instantiated), GREEN on this fix. The project's existing `vitest.setup.ts` already provides a default RO mock — the test layers a tracking version on top.

### CLIENT-T3 — WheelRushView reduced-motion guards (a11y + perf)

**File:** `components/multiplayer/WheelRushView.tsx`
**Severity (before):** MED — `wordBuilderShake` keyframes, fog dot `animate-pulse`, and three `whileTap` scales fired unconditionally regardless of OS-level `prefers-reduced-motion`. WCAG 2.1 AA (project requirement) violation, plus unnecessary layout/composite work for users who explicitly opted out of motion.
**Fix:** Added `useReducedMotion()` hook. Guards:
- Word-builder shake `animate` collapses to a static scale (1) when reduced; transition becomes `{ duration: 0 }`.
- Fog dot `animate-pulse` Tailwind class dropped via `cn(..., !prefersReduced && 'animate-pulse')`.
- All three `whileTap` scales (clear/submit/shuffle buttons) become `{}` when reduced.

**Test:** Added "drops the animate-pulse class on the fog dot when prefers-reduced-motion is set". Mocks `framer-motion`'s `useReducedMotion` via partial-actual mock pattern (`vi.importActual` + selective override) controlled by a module-scope flag. RED on previous code, GREEN after guards. Pattern reusable for future a11y motion tests.

### CLIENT-T2 — WheelRushView socket effect deps stabilized

**File:** `components/multiplayer/WheelRushView.tsx`
**Severity (before):** MED — useEffect deps included `puzzle, t, username, playWordAcceptedSound, playWordRejectedSound`. Whenever `puzzle` flipped from `null` to set (after `wheelRushInit`), all 5 socket listeners were torn down and re-registered. With unstable consumer-side refs (e.g. memo-busted parent), churn could repeat across the match.
**Fix:** Introduced a single `latestRef` that captures the latest `t`, `puzzle`, `username`, and sound functions on every render. Socket handlers read from `latestRef.current` instead of closure. Effect deps reduced to `[socket, flash]` (both stable).

**Why this works:** Socket message handlers fire async and only need the *current* values when a message arrives — they don't need to "subscribe" to changes. The latest-ref pattern is a textbook React way to avoid effect re-runs when you want closure-captured behavior without dependency churn.

**Test:** Added "does not re-register socket listeners when puzzle is set after wheelRushInit". Snapshots `socket.on.mock.calls.length` before/after `wheelRushInit`; must be equal. RED on previous code (10 extra registrations exposed by test mock returning fresh `vi.fn()` instances per call — same fragility that would bite production if a parent re-renders without memoizing the SoundEffectsContext value), GREEN on this fix.

**Note on C-M5 audit claim:** Sub-agent flagged "`socket.on('connect', onReconnect)` registered but never unregistered in cleanup" — incorrect. Line 216 has `socket.off('connect', onReconnect)`. Cleanup is present. The real adjacent issue (deps churn) was discovered via TDD and fixed under CLIENT-T2.

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
| ~~S-M4~~ | ~~`services/gameLifecycle/gameResults.ts`~~ | ~~N+1 INCR; collapse to HMSET~~ | **dropped — wrong shape**: not INCR but Lua-scripted JSON-blob R-M-W with capped `gameIds[]` array. Cannot collapse to HMSET. Real opportunity: `enableAutoPipelining: true` in `backend/redis/config.ts` collapses `Promise.all([n calls])` from N round-trips to 1, benefiting every Redis batch in the codebase. Defer to dedicated infra session — broader scope (touches every Redis user), needs load-test regression + WATCH/MULTI compat verify, and game-end isn't a hot path (player on results screen, not user-perceptible). |
| ~~S-M5~~ | ~~`gameStateManager.ts:84-87`~~ | ~~`gameCache` TTL 30 min × max 200~~ | **dropped — moot in current production**: `gameCache` is gated on `REDIS_PRIMARY === 'true'` (line 77). That env flag is unset in `.env*`/Dockerfile/scripts, so all `gameCache.set` calls (lines 184, 196) sit inside guards that never fire. The cache exists for an alternate deployment mode that isn't enabled. If `REDIS_PRIMARY` is later turned on, revisit: real fix is a deferred `gameCache.delete(gameCode)` in `gameEnd.ts` (~120s after game end, after results-screen reads complete) plus optional cap reduction. Current "6GB held" framing in audit was speculative. |
| ~~S-M6~~ | ~~`shared/schemas/socketSchemas.ts`~~ | ~~Verify wheel-rush registered~~ | **dropped — already shipped**: `gameMode` enum includes `wheel-rush` (line 181), `SubmitWheelWordSchema` exists (line 217), wired in `wheelRushHandler.ts:160` via `validatePayload` |
| ~~C-M1~~ | ~~`MultiplayerInGameView.tsx:238-245`~~ | ~~9 store hooks at root~~ | **shipped — see CLIENT-T6** (extended to PlayerInGameView + HostInGameView) |
| C-M2 | `WheelRushView.tsx:5` | Full `framer-motion` import; wrap in `LazyMotion(domAnimation)` | open — **app-wide sweep needed** (mixed `motion` imports in shared `WordWheelParts.tsx` + others negate single-file LazyMotion) |
| ~~C-M3~~ | ~~`WheelRushView.tsx:368-420`~~ | ~~Pulse/shake without `useReducedMotion()` guard~~ | **shipped — see CLIENT-T3** |
| ~~C-M4~~ | ~~`WheelRushView.tsx:303`~~ | ~~`getBoundingClientRect()` in undebounced resize handler~~ | **shipped — see CLIENT-T4** |
| ~~C-M5~~ | ~~`WheelRushView.tsx:187-200`~~ | ~~`socket.on('connect')` not `off`'d~~ | **dropped — false claim, see CLIENT-T2** |
| ~~C-M6~~ | ~~`MultiplayerInGameView.tsx:26`~~ | ~~`BlastGame` (528 lines) imported eagerly though branch-rendered~~ | **shipped — see CLIENT-T5** (extended to WordHuntGame + WheelRushView) |

C-M5 is HIGH severity — will cause stale handler firing on rematch. Recommend addressing in next perf cycle or a small standalone fix.

---

## Lessons

1. **Sub-agent finding ≠ verified bug.** Two of four "H-class" findings were wrong at the source. Always verify line ranges and intended semantics before refactoring.
2. **Wire-format changes are perf sprint kryptonite.** Even when correct (H3 is real), they belong in their own session with explicit back-compat plan.
3. **Parent re-renders from a high-frequency ticker is the textbook React leak.** Two consumers, two render frequencies → split into leaf components.

---

## Session shipped (6 commits on master)

| # | Commit | Fix | Net LOC |
|---|---|---|---|
| 1 | `25fb90fb7` | Fog ticker → leaf (CLIENT-T1) | +29 / -7 |
| 2 | `ec202e628` | Socket deps → latestRef (CLIENT-T2) | +28 / -8 |
| 3 | `e00ec8143` | Reduced-motion guards (CLIENT-T3) | +22 / -8 |
| 4 | `bc893dc53` | ResizeObserver swap (CLIENT-T4) | +14 / -8 |
| 5 | `695b5ebe6` | Mode views → dynamic chunks (CLIENT-T5) | +21 / -3 |
| 6 | `8f9e94845` | Subscriptions → leaf (CLIENT-T6) | +42 / -87 |

## Final audit-vs-reality scorecard

| Category | Count | Items |
|---|---|---|
| Verified-real, shipped | 6 | CLIENT-T1, T2, T3, T4, T5, T6 |
| Disconfirmed (audit was wrong) | 4 | H1, H4, C-M5, S-M4 (as stated) |
| Already-shipped before audit | 1 | S-M6 |
| Moot (config gate not active) | 1 | S-M5 |
| Real, deferred (separate session) | 5 | C-M2 (LazyMotion app-wide), S-M2 (blast delta), S-M3 (rate-limit infra), S-M4 (autoPipelining infra), H3 (leaderboard wire-format) |

## Lessons reinforced

1. **Sub-agent findings are prompts, not specs.** Direction useful, specific shapes/severities require source verification. Half the audit's claims were wrong at the line.
2. **Wire-format and infra changes don't fit perf-sprint commits.** Bundle them into their own sessions with appropriate regression tooling (load tests for infra, back-compat plans for wire formats).
3. **TypeScript catches refactor blast radius.** Lifting subscriptions into InGameScreen surfaced two unflagged consumers (PlayerInGameView, HostInGameView) via build:fast type-check.
4. **Net-negative LOC perf wins exist.** CLIENT-T6 deleted 45 more lines than it added. Zustand + leaf-subscription pattern means consumer-near subscriptions = less code AND fewer renders.
5. **`prefer-no-build-after-every-change` is right except when refactoring shared interfaces.** Build:fast caught CLIENT-T6's missing consumer immediately; multiplayer test suite alone didn't.
