# Spec: Blast → Multiplayer Ready + MP Mode Tracking

Status: IN-PROGRESS · Owner: session 2026-05-29 · Goal-driven

## Progress
- P1 hook: DONE — MP full-board-clear ends room (`useBlastGameEnd` MP branch + `onMPBoardCleared`); tested.
- P1 results: BlastMpResults built + wired host (TvResultsView) + player (ResultsPage, in progress).
- P2 bots: DONE — `startBotsForBlast` on live shared board, anti-grief cap, dispatch branch; mirrors human mutation+broadcast; 11 tests.
- P3 tracking: DONE — gameResults fallback fixed; growthTracking forwards MP extras; useGameStartTelemetry enriched + new useGameEndTelemetry wired in PlayerView+HostView (game_started/game_completed carry gameMode+isMultiplayer+roundIndex for nightly); admin per-mode breakdown (fetchMpModeBreakdown + API mpBreakdown field + MpModeBreakdown admin card); in-game MpModeBreakdown component (best-effort data).
- P4 gate: DONE — removed blast_access/admin gate (gameStartHandler, HostPreGameView, BattleModeCard, LandingView). Blast enabled for all.
- Remaining: final UI wiring (player results + board-cleared celebration store flag) in flight; then full lint+test+build, commit, push.


## Board model (settled from code)
Blast MP board is **SHARED + server-authoritative**. One `game.blastModeState.tileStates` / `game.letterGrid`; all players race on it; a valid word mutates the single board server-side and `blastBoardUpdate` broadcasts the same snapshot to the whole room. Word validation = `isWordOnBoardAsync` on the live mutating grid (same path-trace as classic). `playerMoves/playerBonusMoves/playerStats` are per-username counters layered over the shared board.

Consequences:
- Tile exhaustion / board-clear = **room-level** event. `blastDeadEnd → endGame(room)` is correct, not a bug.
- Bots clearing tiles **remove them from humans** → bot correctness is a real gameplay-integrity issue, not cosmetic.
- Blast is **excluded from non-admin random rotation** today (`gameStartHandler.ts:308`), so the bugs are NOT yet reaching users → enable-for-all is safe to do LAST.

## Gaps (verified)
1. **Tile-exhaustion UX** — `lib/blast/v2/useBlastGameEnd.ts:186-190`: MP dead-end calls `onMPDeadEnd()` then `return` with no local UI. `isComplete` (full board clear) path is SP-only (`:80`), never triggers early-end in MP.
2. **No special MP results** — blast falls through to the generic classic scoreboard at MP end.
3. **Bots broken on shared board** — `backend/services/gameLifecycle/botGame.ts`: no `startBotsForBlast`; blast falls through to classic path which solves a *static* 6×6 grid, not the live dynamic board (2s `resyncBotsForNewGrid` is a band-aid). Bots can submit stale words / clear wrong tiles → griefs humans on the shared board. Wheel-rush + word-hunt have dedicated drivers; blast doesn't.
4. **Tracking** — `game_results.game_mode` fallback hardcoded `'multiplayer'` (mismatches mode enum); `/api/game-mode-stats` lumps all MP into "arena"; PostHog `trackGameStart/End` never fired from MP; per-round mode+score not retained for an in-game breakdown; admin has no MP-mode split.
5. **Gate** — `blast_access`/`is_admin` gate in `HostPreGameView.tsx:134` + `gameStartHandler.ts:287-314`.

## Deliverables & phases (TDD each; ask before each commit)

### Phase 1 — Tile-exhaustion flow + special blast MP result
- Fix `useBlastGameEnd` MP branch: on dead-end AND on `isComplete`, play a local "Board Cleared / No Moves Left" beat, then surface results (don't silently `return`). Still emit `onMPDeadEnd()` so server ends the room (idempotent).
- New blast-flavored MP results surface: per-player rank, score, words, best combo, tiles cleared, board-cleared celebration. Render at MP end when `gameMode==='blast'` instead of the plain scoreboard.

### Phase 2 — Blast bots on the live shared board
- `startBotsForBlast(io, gameCode, bots, blastModeState, language, timer)`; branch in `botGame.ts` before the classic fall-through.
- Bots solve the **current** `blastModeState.grid` (re-solve on mutation, not stale static), submit via the same validated `submitWord`/word path so clears are legitimate; bound clears via `shouldBotScore` so a bot can't strip the shared board (anti-grief).

### Phase 3 — Mode tracking (DB + PostHog-for-nightly + in-game breakdown + admin)
- Fix `gameResults.ts` fallback → real resolved `gameMode`.
- Retain per-round `{mode, score, placement}` for the room so an **in-game** end-of-session breakdown (round-by-round mode + score) renders (player-facing PRIMARY).
- PostHog: emit `game_started` / `game_completed` from MP path with resolved `gameMode` + `roundIndex` + `isMultiplayer` so the **nightly intelligence job** can mine MP-mode popularity/outcomes.
- Admin: split "arena" into classic/blast/word-hunt/wheel-rush in `/api/game-mode-stats` + dashboard card.

### Phase 4 — Enable for all (LAST, only after 1–3 verified)
- Remove `blast_access` gate (`HostPreGameView`, `gameStartHandler`); keep blast in `ALL_GAME_MODES` rotation for everyone.

## Out of scope
Per-player blast boards (it's shared by design); rewriting blast SP; payment/auth changes.
