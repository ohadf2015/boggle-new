# PostHog Pain Points & Opportunities — 2026-06-27

Source: PostHog project 151059 (eu), last 30 days. **Pre-traction volume** (~315 active
users, 226 game starters, 100 completers) — signals are *directional*, ranked by distinct
affected users, not raw event counts. Dev-host (`localhost`) rows excluded from prod numbers.

---

## TL;DR

| # | Pain point | Impact (distinct users) | Type |
|---|---|---|---|
| 1 | **MP `random` matchmaking / liquidity** — default MP path, highest abandon | 28 abandon / 116 start (24%); `mp_player_dropped` ~311/315 users; rageclicks all on `/multiplayer` | Structural |
| 2 | **Word-Wheel WASM fails to load** — mode breaks | 34 users | Bug |
| 3 | **React #418 hydration on invite-landing** (`/en?room=…`) | 15 users | Bug |
| 4 | **Hebrew network reliability** (`Failed to fetch` on `/he/*`) | 14 users | Infra/region |
| 5 | Minor: `null 'clear'` (word-wheel), chunk-load failures, Capacitor log-noise | 3–8 each | Cleanup |

**Top opportunity:** guest→account conversion — **86 users shown a signup prompt, only 26 ever identified.** Most players never create an account.

---

## Pain points

### 1. Multiplayer `random` matchmaking is the most-traveled and most-abandoned MP path
`random` is the **default host lobby selection** (`HostPreGameView.tsx:221`); backend
`selectNextGameMode()` rolls a concrete mode (`gameModeSelector.ts:30-71`). Three signals converge:
- **Abandonment**: `growth:game_abandoned` for `random` = 28 users / 116 starters ≈ **24%**, vs
  classic ~8%. Fires while still tagged `random` → users bail in the **lobby / matchmaking wait**.
- **Rageclicks**: nearly all rageclick volume is on `/multiplayer` (`?quickPlay=true`, `?room=…`),
  es + en — repeated tapping while waiting to join.
- **`mp_player_dropped`**: ~311 of ~315 users → near-universal. In a pre-traction app this is an
  **MP liquidity problem**: games are bot-padded with constant churn, no real-player liquidity.

> Note: cross-mode *completion %* is unreliable (e.g. `brain-drill` shows 0 started / 18 completed).
> `random` starts complete under their *resolved* mode, so "7% random completion" is an artifact —
> ignore it; abandonment is the robust signal.

### 2. Word-Wheel WASM solver fails to load — 34 users
`RuntimeError: Aborted(both async and sync fetching of the wasm failed)` on `/daily/word-wheel`
(en + sv), **34 distinct users / 74 events**. When the WASM fails the mode is unplayable. Highest
*user-facing* error in the app. Likely a missing/incorrect-MIME `.wasm` asset path or CSP/CDN gap
(cf. CDN-offload + CSP memos). Plus related `Cannot read properties of null (reading 'clear')`
(8 users) on the same word-wheel pages.

### 3. React #418 hydration mismatch on invite-landing — 15 users
`Minified React error #418` on `/en?room=…` (invite deep-links). Known recurring class
(Pitfall #1: dual source of truth + async resolution). Hurts exactly the **viral invite path** —
the worst place for a hydration flash.

### 4. Hebrew pages: network reliability — 14 users
`Failed to fetch` / `NetworkError` clustered on `/he`, `/he/daily`, `/he/multiplayer`,
`/he/leaderboard` (14 users, 156 events). Region/network (Israel) or an API reliability gap on the
Hebrew surface. Worth checking API latency/error rate from IL + retry handling.

### 5. Minor cleanups
- `chunk … failed to load` (4 users) — stale-deploy / cache; add chunk-load-error reload handler.
- `AbortError: Lock was stolen` (4) — `navigator.locks` contention; usually benign.
- `ResizeObserver loop` (5) — benign, suppress in error reporting.
- **CapacitorGameConnect not implemented on android** — 543 events but only **3 users / ~2 devices**.
  Calls *are* guarded (`nativePGS.ts:58`, `awardPlayGames.ts:54`) but the native plugin is
  half-installed (JS bridge present, method missing) in some Android build → it still throws. Pure
  error-budget/Sentry-cost pollution (memory: Sentry quota was blown). Cheap to silence.

---

## Opportunities

### A. Guest → account conversion (biggest growth lever)
86 users saw `growth:signup_prompt_shown`, **only 26 became `user_identified`** in 30 days. The app
acquires and activates fine (141 first-game-played, 60 first-win, 59 streak-continued) but **fails
to convert players into accounts**. Levers: better prompt timing (after first win / streak), value
framing (save streak/cosmetics/rank), lighter auth.

### B. Fix MP liquidity, not just MP bugs
The structural MP issue is *no real opponents*. Options: faster/clearer bot fill with honest framing,
async/"ghost" races vs recorded runs, shorter matchmaking timeout with instant solo fallback
(`mp_solo_prompt_shown` already exists — 85 users — measure its accept rate and lean into it).

### C. Instrumentation debt — can't currently measure the MP funnel
`game_completed` is tagged with the *resolved* mode while `game_started` carries `random`, so MP
start→finish is unmeasurable. Add a stable `sessionGameMode` / `requestedMode` vs `resolvedMode`
pair on both events. Without this, every future "is MP better now?" question is unanswerable.

### D. Daily challenge is working — invest there
`daily_puzzle_opened` 31 → `daily_puzzle_completed` 22 (~71%); streaks healthy. Daily is the
retention engine; the WASM word-wheel bug (#2) is directly sabotaging a daily mode.

---

## Suggested order
1. **Word-Wheel WASM load** (#2) — clear bug, 34 users, breaks a daily mode. Highest ROI.
2. **MP funnel instrumentation** (Opp C) — unblocks measuring everything else in MP. Tiny change.
3. **#418 invite-landing hydration** (#3) — protects the viral path.
4. **Signup conversion** (Opp A) — biggest growth lever; product+copy work.
5. **MP liquidity** (Opp B) — bigger bet; design call.
6. Silence Capacitor + ResizeObserver + chunk-load noise (cheap, restores error budget).

---

## Fix log (2026-06-27)

**Shipped (committed; TDD RED→GREEN, lint+tsc clean):**
1. **Word-Wheel WASM** (`98b3cff98`) — `scripts/copy-sql-wasm.mjs` serves `/sql/sql-wasm.wasm`
   (was 404 in prod) + `loadBrowserSqlJs()` fetches the binary itself so a load failure is a
   catchable Error, not an uncatchable emscripten abort. Root cause confirmed by prod `curl → 404`.
2. **MP funnel instrumentation** (`f79f13116`) — `useGameStartTelemetry` `ready` gate; MP sites pass
   `ready: gameModeConfirmed` so `game_started` captures the resolved mode (matching `game_completed`);
   `requestedMode` added on host to keep the random-roll intent signal. *Forward-only — pre-deploy
   per-mode completion % stays unreliable.*
3. **#418 invite hydration** (`7914c5671`) — `PageClient` `mounted` gate on the invite spinner + CTA
   so first client paint matches the SSG server's LandingView. (Largest #418 cluster was the
   `?room=` Facebook-link; the rest are diffuse singletons, not chased.)
4. **Signup toast nag** (`799d28a36`) — `mp_toast` had no shown-marker → re-fired ~5.8×/user
   (one user 22×/day). Added once-per-session guard, marked at show-time (Class 1).

**Deferred — not a clean code fix (documented, deliberately not churned):**
- **#4 Hebrew `Failed to fetch`** — by *users* it's spread (he 5 / es 5 / sv 3 / en 2), not
  Hebrew-specific; the he event count is inflated by ~5 users on bad-network/retry sessions.
  Signature = generic flaky-network `fetch()` (likely an analytics/API beacon), no single defect.
- **Opp B — MP liquidity** — `mp_player_dropped` ~311/315 users = no real-opponent liquidity
  (bot-padded). Product/design bet (async/ghost races, honest bot framing, faster solo fallback),
  not a bug fix.
- **Signup *conversion* itself** — the `mp_sheet` (80% dismiss) copy/timing is the real lever;
  deliberately NOT rewritten (speculative, and this codebase has 4+ prior popup re-show bugs).
- **#5 error-budget noise** (Capacitor android 543 evts/3 devices; ResizeObserver; chunk-load) —
  Capacitor throws from a half-installed native bridge; fixing risks the device-gated PGS feature
  for ~0 user benefit. Left.
