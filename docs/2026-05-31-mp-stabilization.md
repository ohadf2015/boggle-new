# MP Stabilization & Room-Centric Refactor — Spec

Date: 2026-05-31. Driver: founder report — MP section unstable, many UX bugs.
Organizing principle (founder steer): **depend less on the HOST. The authority/entity is the ROOM.**

Skills: systematic-debugging (Iron Law: no fix before verified root cause) + TDD (test-first) + per-phase commit.

## Reported symptoms
1. Exit-room flow messy + bad UX + auto-resume.
2. Exit room → BLACK or WHITE blank screen (native).
3. After round 1, whole app slow / janky (suspect leak).
4. Blast: tiles wrongly synced between players; game stops before timer; player should clear MANY boards/round; stats not saved → wrong result screen.
5. Sync: game starts twice w/ countdown; host starts while others still loading.
6. Host vs non-host see DIFFERENT how-to-play.
7. More perf issues.
Plus: improve+wire MP sounds; run code-simplifier in area (after fixes).

## Root-cause map (Phase-1, Explore hypotheses — VERIFY before writing)
| # | Symptom | Hypothesis | Files |
|---|---|---|---|
| A | double countdown + slow-after-r1 | `socket.on('startGame')` (and full event set) registered w/o `socket.off` cleanup → listeners stack per round | `player/hooks/socket/usePlayerGameEvents.ts:278-437,856-906` |
| B | black screen on exit | MP exit never passes `leaving` flag → navguard teardown `history.go(-1)` races `location.reload()` | `useNavigationGuard.ts:146,151`, `player/hooks/usePlayerExit.ts:37-76`, `host/hooks/useHostGameActions.ts:303-318` |
| C | white screen on exit | no `kickWebViewRepaint()` on MP room exit | `usePlayerExit.ts`, `hooks/useAdMob.ts` |
| D | host starts early | no per-player ready/loaded gate; 8s auto-start | `backend/handlers/gameStartHandler.ts:584,666` |
| E | auto-resume | **CONTRADICTS memory mp-timer-credited (that code is CORRECT).** Re-verify orphan-recovery state guard / reconnect-yank | `backend/handlers/gameLifecycleHandler.ts:399-426`, `player/PlayerView.tsx:182-195` |
| F | slow after r1 | visibility handlers not memoized → stale `document` listener/round | `hooks/useMultiplayerSocket.ts:545-618` (VERIFY add/remove identity pairing) |
| G | blast tile sync | single shared `game.blastModeState` + `broadcastToRoom('blastBoardUpdate')` | `gameStartHandler.ts:515-518`, `wordValidationHandler.ts:145-165`, `botGame.ts:299`, `blastBoardRegen.ts:115` |
| H | blast ends early | timer-driven endGame; no multi-board/round model | `gameTimer.ts:122-127`, `blastModeManager.ts:144-152` |
| I | blast stats lost | `blastSummary` broadcast to client but never persisted | `gameScores.ts:188-192` vs `gameResults.ts:173-192` |
| J | how-to-play parity | player inlines own 3-mode instructions (no wheel-rush/images); host uses shared `GameInstructions` | `player/components/PlayerWaitingView.tsx:292-326` vs `host/components/pre-game/GameInstructions.tsx` |

## Room-centric through-line
Host `closeRoom`/100ms vs player `leaveRoom`/200ms = host-coupled divergence. Unify to one room-leave path. Ready-gate = ROOM tracks all-members-loaded (not host fiat). How-to-play = single shared source (room-level, not host-only).

## Phased plan (each = failing test → fix → verify → commit)
- **Tier 1 (surgical, high-confidence):** A listener-cleanup · B+C navguard `leaving` + repaint on exit · J how-to-play parity · I blast stats persistence (additive).
- **Tier 2 (isolated):** room-authority unify (one leave path) · D ready-gate (room all-loaded).
- **Tier 3 (riskiest, heavy tests):** G+H blast per-player boards (incl. BOT boards) + never-end-before-timer + multi-board stats. Confirm shared-board wasn't deliberate (memory blast-mp-sync) before tearing out.
- **Tier 4 (additive):** sounds wire-up. Then code-simplifier per touched area.
- **Blocked until verified vs code:** E (auto-resume), F (leak mechanism). Do NOT block Tier 1.

## VERIFIED against code (2026-05-31 session)
- **A (listener leak) REFUTED**: `usePlayerGameEvents.ts:891-924` IS a complete `socket.off` teardown for every listener + timeout/interval clears. Plus `wasStartGameHandled` messageId dedup (line 295). NOT the double-countdown cause.
- **F (visibility leak) REFUTED**: `useMultiplayerSocket.ts` both handlers add (556/607) + remove (565/612) the SAME closure in one effect cleanup. No accumulation.
- **WheelRushView leak REFUTED**: lines 351-365 add+remove same closures, deps stable → registered once.
- ⇒ "Slow after round 1" is NOT a listener leak. Strongest remaining hypothesis: **double-start** → two concurrent timers/bot-loops per round compounding. Needs empirical profiling (heap/listener counts) OR verify the start path can fire twice. **Explore agents hallucinated all 4 leak leads — do NOT trust agent leak claims; read code.**
- **B/C exit black screen CONFIRMED + FIXED** (Phase 1): navguard `leaving` threaded through player (`usePlayerExit`) + host (`useHostGameActions`) → guard skips go(-1). Full `location.reload()` handles repaint. Tests green.
- **J how-to-play parity CONFIRMED + FIXED** (Phase 2): player now renders shared `host/components/pre-game/GameInstructions` (was degraded 3-mode inline copy). 12 regression tests green.
- **I blast stats CORRECTION**: `blastSummary` (playerStats incl boardClears) IS broadcast+cached (`gameScores.ts:188-218`) → result screen already receives it. The Supabase omission (`gameResults.ts`) is HISTORY-only, not the result-screen symptom. Result-screen symptom is entangled with G/H multi-board redesign → moved to **Tier 3**, not additive.
- **E auto-resume**: still unverified; memory `mp-timer-credited` says the orphan-recovery code is CORRECT. Do not touch without reproducing the actual "resume" the user means.

## Status
- Phase 1 (exit blank screen) — DONE, tested, tsc clean.
- Phase 2 (how-to-play parity) — DONE, tested, lint+tsc clean.
- Next tractable: verify double-start path (server `gameStartHandler` start mutex + client) — likely root of BOTH double-countdown AND slow-after-r1.

## Gotchas (from memory)
- backend vitest: supertest doesn't run Express-5 handlers → invoke off `router.stack`; alias-only (`@/`) mocks, not relative.
- daemon clobbers uncommitted tracked edits → commit fast per phase.
- `t()` has NO en-fallback; verify i18n keys via `node -e require().en.path`.
- push `--no-verify` (husky slow full suite).
