# MP Stability — "Players Leave Mid-Game" Audit + Fix Spec

**Date:** 2026-06-06
**Status:** Implementing
**Author:** investigation + advisor-reviewed

## Problem statement (as reported)
"Many players leave in the middle of MP games." Asked to audit the whole MP stack, find gaps/bugs/connectivity issues, make it more stable, find the root cause.

## What the investigation actually found

### The headline finding: the premise is currently **unmeasurable**
- **Client telemetry blind:** `game_abandoned` (PostHog) fires only **7×/30d, all `connections` mode, ZERO multiplayer.** MP abandons are not instrumented. `mode`/`gameMode` props mix SP+MP, so start→complete gaps (classic 73%, random 69%) **cannot** be attributed to MP.
- **Server telemetry blind:** disconnects are logged (`connectionHandler` logs ping-timeout at WARN) but Railway deploy logs are **per-deployment and ephemeral** (8 redeploys in 2.5h wipe history). Disconnect-reason distribution is not recoverable.
- **Crashes ruled out:** `$exception` on MP pages = 54 events / 12 users / 30d, dominated by benign noise (native `Network` plugin shim, React #418 hydration). Not the driver.

**Conclusion:** We cannot rank causes by data because the signal isn't captured on either end. Therefore **fix #1 is to add the measurement.** This is Phase-1 evidence-gathering (per systematic-debugging), not a premature fix.

### Code-audit failure modes (real code; frequency UNVERIFIED — labeled as such)
| # | Failure mode | File:line | Confidence | Classification |
|---|---|---|---|---|
| A | MP mid-game leave uninstrumented (both ends) | — | **HIGH** | **Headline gap → Fix #1** |
| B | Cold-dict on server-restart resume → bots score 0, leaderboard frozen-at-wrong-values | `gameTimer.ts:201-226` `resumeGameTimerIfMissing` lacks `ensureLanguageLoaded` | **HIGH** (corroborated by SRV-M3 / Wheel-Rush memory) | **Correctness bug → Fix #2** |
| C | Player grace 2min → permanent removal on network blip (WiFi→cellular) | `connectionHandler.ts:43,347-358` | MEDIUM (unverified freq) | **Hardening → Fix #3** |
| D | First-game launch stall; server safety net only at 10s | `gameStartCoordinator.ts` + `gameTimer.ts:250` | MEDIUM | Defer / monitor via Fix #1 |
| E | Rate limit hard cutoff 50/10s, ping timeout 60s on slow client | `rateLimits.ts`, `socketSetup.ts:54-55` | LOW | Defer / monitor via Fix #1 |

## Scope of THIS change

### Fix #1 — Instrument MP mid-game leave (HEADLINE)
Server-side `mp_player_dropped` capture at the TWO places players actually vanish mid-game, both of which were previously dark:

**(a) Silent disconnect-without-reconnect** — grace-expiry removal in `connectionHandler.ts` (`source: 'grace_expiry'`). The true "dropped and never came back" moment (transient reconnects don't reach it; bots return early before the timer arms). Rename `_reason`→`reason` to thread the disconnect reason into the closure.
- **Critical:** `durationSec` is measured from `disconnectedAt` (the actual drop), NOT the grace-expiry `Date.now()` — the callback fires a full grace period (~2min) later, which would otherwise inflate every duration past the grace and make rage-quits (<15s) unobservable. (Caught in review; pinned by a wiring test asserting `durationSec=30`, not ~150.)

**(b) Host-drop cascade** — when the host abandons and the room closes (`hostLeftRoomClosing` → `deleteGame`), EVERY remaining human is kicked and their own disconnects find no game → emit nothing. This is the most literal "many players leave at once". Emit one `mp_player_dropped` per remaining human at the close point (`source: 'host_left'`, `reason: 'host_left'`), before `deleteGame`. Makes `wasHost=true` reachable.

Pure builders in `backend/utils/mpDropTelemetry.ts`: `buildMpDropEvent(game, username, reason, now)` + `buildHostLeftDropEvents(game, now)`. In the cascade each row's `durationSec` uses that player's own `disconnectedAt` when present (the host dropped a grace period before the room closed → its row is host play-time, not room-lifetime) and `now` for still-connected victims (played until close). Properties: `reason`, `gameMode`, `gameState`, `language`, `durationSec` (clamped ≥0; null if no `gameStartedAt`), `humanPlayers`, `isMultiplayer` (≥2 humans), `wasHost`, `source`. Wired via `getPostHogServer()?.capture(...)`, best-effort (never throws into teardown). TDD: 11 pure-builder tests + 2 connectionHandler wiring tests.

This makes the next investigation data-driven: `reason` + `source` separate **bug** (timeout/transport/host-cascade) from **product** (explicit leave / boredom).

### Fix #2 — Cold-dict on resume (CORRECTNESS, ship regardless)
Make `resumeGameTimerIfMissing` `async`; `await ensureLanguageLoaded(game.language || 'en')` after bot-restore, before `startGameTimer`. Await both call sites (`playerJoinHandler.ts:131`, `gameTimer.ts:253` safety-net callback). Mirrors fresh-start path (`gameStartHandler.ts:387`).
- TDD: assert `ensureLanguageLoaded` awaited with `game.language` before `startGameTimer` on resume.

### Fix #3 — Extend player grace 2min → 5min — **HELD** (not shipped)
Considered, then deliberately deferred: (1) changing removal behavior in the same release as the telemetry would contaminate the day-1 baseline we're trying to establish; (2) for normal 90–180s rounds the grace rarely expires mid-round anyway (the round ends first), so it barely addresses "leave in the *middle*" — its real effects are empty-room reap latency + between-round reconnects. Default stays 120000 (still env-overridable). Revisit on `mp_player_dropped` data showing how many drops actually hit grace-expiry vs reconnect.

## Out of scope (recommendations only, gated on Fix #1 data)
- D/E launch-stall, rate-limit backoff, mobile ping-timeout extension — revisit once `mp_player_dropped` shows which reason dominates.
- **Explicit Exit-button leaves** (the `leaveRoom` path in `playerJoinHandler`) are intentional and go through a separate handler; v1 instruments only the silent disconnect-without-reconnect path (the mysterious "leaves"). The `source` property on `mp_player_dropped` is already shaped for a later `source: 'explicit_leave'` emit so both can sit in one funnel.

## Verification
- TDD: `mpDropTelemetry` 11 pure tests (grace + host_left builders), `gameTimer.resumeColdDict` 3 tests, 2 `connectionHandler` wiring tests (durationSec-from-disconnectedAt + host cascade); updated existing `resumeRehydrated` / `startSafetyNet` for the now-async resume.
- Full `npm run test:backend`: **3014 pass, 0 fail** (133 pre-existing skips). Confirms the `resumeGameTimerIfMissing` sync→async signature change + new `@/lib/posthog` import in `connectionHandler` regress nothing across the backend. Lint clean on changed files. (`npm run build`/tsc not run — full-project tsc OOMs in this env; the full backend test suite is the gate.)
- NOT live-verified end-to-end (MP socket-gated room can't be created headless). Telemetry is a no-op without `NEXT_PUBLIC_POSTHOG_KEY` in the server process — confirm it's set on Railway so events flow.

## Honest caveats
- "Many leave" is **not established** for MP; it may be low-frequency or product-driven. Fix #1 is what makes it knowable.
- Fix #3 is hardening, not a proven cause.
