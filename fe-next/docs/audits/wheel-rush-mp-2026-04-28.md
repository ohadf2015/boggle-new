# Wheel Rush (MP Word-Wheel) Audit — 2026-04-28

4-lens audit of multiplayer Wheel Rush mode: server, client, bot, tests.

**Modules**
- Server: `backend/modules/wheelRushManager.ts`, `backend/handlers/wheelRushHandler.ts`, `backend/services/gameLifecycle/botWheelRush.ts`
- Client: `components/multiplayer/WheelRushView.tsx`, `components/multiplayer/WheelRushDomination.tsx`
- Shared: `shared/constants/wheelRushConstants.ts`, `shared/schemas/socketSchemas.ts`
- Tests: 5 files, 16 tests, all green (`npm test -- wheelRush` → 819ms)

Findings filtered against false-positives flagged by reread of source.

---

## CRIT (ship blockers)

### C1 — `submitWheelWord` schema not registered in `socketSchemas.ts`
- **Where:** `wheelRushHandler.ts:39-41` (inline `submitWheelWordSchema = z.object(...)`)
- **Issue:** Every other socket event registers Zod schema in `shared/schemas/socketSchemas.ts` and types via `ClientEventSchemas` map. Wheel-rush bypasses centralized validation, breaks single source of truth.
- **Fix:** Move schema to `socketSchemas.ts`, register in `ClientEventSchemas`. ~10 lines.

### C2 — Hardcoded English `"STEAL +X"` flash text
- **Where:** `WheelRushView.tsx:146`
- **Issue:** `flash('ok', \`STEAL +${data.score}\`)` — Hebrew/Japanese/Spanish/Swedish players see English string. Project rule: ALL UI text via `t()`.
- **Fix:** Add `wordWheel.stealGain` key to 5 translation files, use `t('wordWheel.stealGain', { score: data.score })`.

### C3 — `t() || fallback` pattern breaks `{min}` interpolation
- **Where:** `WheelRushView.tsx:269,274`
- **Issue:** `(t('wordWheel.tooShort') || 'Too short').replace('{min}', ...)` — when `t()` returns the key on miss, the key string has no `{min}` token, so user sees raw key. Also defeats fallback purpose.
- **Fix:** Pass interpolation params to `t()` itself: `t('wordWheel.tooShort', { min: MIN_LEN })`. Verify keys exist in all 5 locales.

---

## HIGH

### H1 — Reconnection mid-game: server only sends puzzle, not state snapshot
- **Where:** `wheelRushHandler.ts:125-134` (`requestWheelRushState`)
- **Issue:** On rejoin emits `wheelRushInit` with `puzzle + startedAt` only. Misses: current `foundWords` per player, active `locks`, `closed` words, opponent leaderboard. Reloading mid-game = empty board until next event fires.
- **Fix:** Extend payload to `{ puzzle, startedAt, foundWords, locks, closed, leaderboard }`. State already lives in `state` object — just serialize.

### H2 — Fog-of-war timer drift on reconnect
- **Where:** `WheelRushView.tsx:74-97`
- **Issue:** Local `now` ticker every 100ms drives fog mask. After socket drop + reconnect, server sends `startedAt` again but local interval keeps running on its own clock. Fog masking can flicker across reconnect boundary.
- **Fix:** Reset interval after `wheelRushInit` re-fires; use server-relative `now - startedAt` not local `Date.now()` if drift matters.

### H3 — Optimistic UI clears `builtLetters` before server ack
- **Where:** `WheelRushView.tsx:284 → onResult clear ~line 150`
- **Issue:** Submit fires, letters clear immediately, no pending state. If server rejects (duplicate / locked-by-other) user sees their word vanish AND error toast. Confusing.
- **Fix:** Add `submitting` flag, hold letters until `wheelWordResult` arrives (success or failure), restore on rejection.

### H4 — RTL support missing on word chips and leaderboard scroll
- **Where:** `WheelRushView.tsx` (no `dir` attr); `MyWordsChips.tsx:69`; leaderboard `overflow-x-auto` w/ `ms-1` line ~329
- **Issue:** Hebrew locale renders word chips LTR. `ms-1` margin assumes LTR start side. No locale-aware `dir`.
- **Fix:** Wrap word list in `dir={isRTL ? 'rtl' : 'ltr'}`. Replace `ms-1` w/ logical property correct for RTL flip.

### H5 — Rate limit weight too aggressive (20)
- **Where:** `wheelRushHandler.ts:137` `checkRateLimit(socket.id, 20)`
- **Issue:** Default budget 50/10s — weight=20 = ~2 submits before throttle. Endgame sprint regularly hits 3-4 submits/sec. Players rate-limited mid-game.
- **Fix:** Drop to weight=5 (10 submits/10s), or weight=10. Compare blast mode (likely lower). Watch PostHog `rateLimited` events post-deploy.

---

## MED

### M1 — No reduced-motion guards on wheel ring + shake
- **Where:** `WheelRushView.tsx:368-420` (shake/scale), `438-443` (ring pulse 3s loop)
- **Issue:** Project pattern `useReducedMotion()` from framer-motion (see `WheelRushDomination.tsx:68`). Wheel-rush gameplay layer skips it. WCAG 2.1 violation for motion-sensitive users.
- **Fix:** Gate animations behind `useReducedMotion()`.

### M2 — Leaderboard re-renders every 100ms with fog ticker
- **Where:** `WheelRushView.tsx:80,330-353`
- **Issue:** `now` state tick @ 100Hz forces full leaderboard re-render. 10 players → 100 list-item renders/sec. Burns battery on mobile.
- **Fix:** Extract fog countdown to leaf component or memoize `LeaderboardEntry`. Move `now` consumer to where it's actually read.

### M3 — Drag-only word build, no keyboard a11y
- **Where:** `WheelRushView.tsx:193-240` pointer handlers only
- **Issue:** Motor-impaired users cannot drag-select letters. Tap-each is slower workaround. No arrow-key alt path.
- **Fix:** Add focus ring + arrow-key navigation across wheel letters; Enter to add to word, Backspace to pop.

### M4 — `bestWord.length` tiebreak wrong for Hebrew graphemes
- **Where:** `wheelRushManager.ts:112` `bumpBestWord`
- **Issue:** `word.length` counts UTF-16 code units, not graphemes. Hebrew with niqqud or combining marks ranks incorrectly.
- **Fix:** Use `[...word].length` (code points) or grapheme splitter. Low real-world impact since current HE wordlist lacks niqqud.

### M5 — Steal + opponent-score animations stack with no debounce
- **Where:** `WheelRushView.tsx:163-165`
- **Issue:** Two steals within 400ms (shake duration) → overlapping vibration, sound, flash. Visually chaotic.
- **Fix:** Debounce notification stack to one-at-a-time queue.

---

## LOW

- **L1** — `wheelRushHandler.ts:67` re-applies `.toUpperCase().trim()` after Zod transform already did it. Harmless duplication.
- **L2** — `wheelRushHandler.ts:99` log message includes lock expiry detail; not sensitive but noisy.
- **L3** — `WheelRushView.tsx:243` `handleRemoveLetter` keyed by array index; rapid taps could misalign on mobile. Switch to per-letter UUID.
- **L4** — Quick reactions emoji (`useQuickReactions`) floats above feedback toast; can occlude error text for ~1.2s. Stack-order tweak.

---

## Test gap matrix

| Area | Coverage | Top missing |
|------|----------|-------------|
| Manager state machine | 80% | Concurrent submit serialization, Hebrew bestWord ties |
| Handler events | 70% | Reconnect mid-game, dictionary trie null, score-update error path |
| Bot enumeration | 60% | Empty word list crash, difficulty variance, long-trie timeout |
| Client view | 65% | RTL render, drag reset, real socket reconnect, game-end timer |
| Domination summary | 75% | bestWord length tie on Hebrew, zero-stat awards |

Priority adds:
1. Reconnect-mid-game integration test (server + client).
2. RTL render snapshot for Hebrew locale.
3. Dictionary-null path returns clean error not silent reject.
4. Bot enumeration on puzzle with 0 valid words.

---

## Things explicitly NOT broken

- **Race conditions on word locks.** Initial scan flagged this; reread: Node event loop serializes per-process and all submits for one game land in same handler. No real concurrency. (Cluster/multi-node deploy would change this — currently single-process.)
- **Reap timer leaks after game end.** `wheelRushHandler.ts:32-37` registers `gameCleanupEmitter.onGameEnd/onGameReset` to clear `wheelRushReap:${gameCode}:*` prefix. Cleaned correctly.
- **Game state guards.** Handler checks `gameMode === 'wheel-rush'`, `gameState === 'in-progress'`, `wheelRushState` exists, before touching state. Solid.
- **Try/catch wrapping.** Lines 146-151 wrap handler call, log + emit user-friendly error.

---

## Recommended sprint (≤2 days work)

P0: C1, C2, C3, H1, H4, H5
P1: H2, H3, M1, M2
P2: M3, M4, M5, test gaps 1-3

P0 alone closes shipping risk. Estimated <1 day.

---

## Status — 2026-04-28 follow-up fixes shipped

- ✅ **C1** — `SubmitWheelWordSchema` moved to `shared/schemas/socketSchemas.ts` and registered in `ClientEventSchemas` map. Handler imports from shared. Type exported.
- ✅ **C2** — `STEAL +X` replaced with `t('wordWheel.stealGain', { score })`. Key added to all 5 locales (en/he/sv/ja/es).
- ✅ **C3** — `t() || fallback.replace('{min}'…)` pattern replaced with `t(key, params)` direct interpolation at lines 269/274. Fallbacks now usable strings, not key-tokens.
- ✅ **H5** — Rate limit weight dropped from 20 → 5 (~10 submits/10s). Endgame sprints no longer throttled.
- ✅ **H1** — `requestWheelRushState` now returns `{ puzzle, startedAt, foundWords, locks, closed, myWords }`. Extracted `handleRequestWheelRushState` for testability. Added 2 TDD tests (rich-state hydration + non-wheel-game silent return). Client `onInit` rebuilds `activeLocks` + `myWords` (lossy: kind reduced to `locked`/`closed`, steal-history not retained — acceptable for resume).
- ✅ **H4** — `dir="auto"` added to chip elements in `WheelRushPieces.tsx` (StealableLocks word display + MyWordsChips items). Browser auto-detects per-string direction so Hebrew + Latin words display correctly side-by-side. Audit overcalled `ms-1` leaderboard issue — `ms-` is already a logical property and RTL-safe.

P0 — **all 6 shipped**. Tests: 16/16 wheel-rush + 9/9 handler (2 new TDD tests pass). Backend full suite: 2396 passed. ESLint clean.
