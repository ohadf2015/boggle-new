# MP Blast-Mode Audit — 2026-04-23

Server-side concurrency/correctness audit of multiplayer blast mode. Previous sprint (C1–C3, H1) shipped on master. This document records the **remaining** findings so they survive compaction.

## Already Shipped (prior sprint)
- **C1** — Wave-advance race on human path (`wordValidationHandler.ts`)
- **C2** — Bot word-pool not regenerated after grid change
- **C3** — `resyncBotsForNewGrid` helper wired at both bot and human wave-advance sites (commit `17640d258`)
- **H1** — `bot.score` miscount: blast/wordHunt bonus now credited; callback contract widened to `number | boolean | void` (commit `6eb755294`)

## Remaining Findings

### H2 — Concurrent `isBlastBoardCleared → advanceBlastWave` race
- **Files:** `wordValidationHandler.ts:144`, `botGame.ts:248`
- **Problem:** No lock guards the check→mutate sequence. Because `onWordSubmit` is `async`, two concurrent submissions (bot+human, or two bots) can both observe `cleared=true` on the same `tileStates` snapshot, both call `advanceBlastWave`, both `Object.assign` into `blastState`. Second write silently wins; first wave-advance broadcast fires with stale state.
- **Repro:** Bot A callback computes gravity, sees cleared; before its `Object.assign` runs, human submit (sync) also sees cleared; both advance.
- **Fix:** Per-game `blastWaveAdvancing` boolean flag, set before `advanceBlastWave`, cleared after broadcast. Early-return guard at both call sites.

### H3 — Bot submissions during final-wave endGame window re-arm timer
- **Files:** `wordValidationHandler.ts:180`, `botGame.ts:282`
- **Problem:** `timerManager.setTimeout('blastEnd:${gameCode}', ..., 1500)` replaces same-key timer. During the 1500ms window bots are still active; each bot submission on the cleared board re-schedules `blastEnd`, resetting countdown. `endGame` can be deferred indefinitely.
- **Repro:** Final wave clears T=0. Bot submits T=500ms, still sees `cleared=true` (wave count at max, no advance path), schedules `blastEnd` again → endGame at T=2000ms. Loops.
- **Fix:** Immediately after scheduling `blastEnd`, call `botManager.stopAllBots(gameCode)` so no new bot submissions arrive.

### M1 — `resyncBotsForNewGrid` await window lets bot submit on old grid
- **File:** `botLifecycle.ts:174-176`
- **Problem:** `prepareBotWords` is awaited, then `currentWordIndex = 0`. A scheduled bot timer firing between those two statements can submit a word from the old `wordsToFind` array against the already-overwritten new grid — producing wrong `blastTileBonus`.
- **Repro:** Wave N clears, resync awaits solver (~50ms), bot timer fires at T=20ms, submits old-grid word against new blastState.
- **Fix:** `bot.currentWordIndex = bot.wordsToFind.length` (stall) before `await prepareBotWords`, reset to 0 after.

### M2 — `shouldBotScore` variance re-rolled every call
- **File:** `botGame.ts:126-128`
- **Problem:** `variance = 0.9 + Math.random() * 0.2` on every invocation produces a non-monotone ceiling. Bot can be blocked at word N, pass at word N+1 simply because variance rolled higher. No consistent per-game cap.
- **Repro:** Bot=980, human=1000, ratio=0.95 → target oscillates 950–1050 each call.
- **Fix:** Compute variance once per game; store on `Bot` or in a per-game map alongside `gameScoringStart`.

### M3 — `game.letterPositions` stale after wave advance
- **Files:** `wordValidationHandler.ts:149-160`, `botGame.ts:252-263`
- **Problem:** After `Object.assign(blastState, next)` the new grid is live but `game.letterPositions` (built once at game start) is unchanged. `getTilesOnPath`/`getWordPath` resolve positions against wave-1 letters, producing wrong tile bonuses on waves 2+.
- **Repro:** Wave 1 'A' at (0,0); wave 2 'A' at (2,3). Bot word containing 'A' queries stale (0,0) against new overlayMap.
- **Fix:** Rebuild `game.letterPositions` from `next.grid` at both wave-advance sites.

### M4 — `playerWordsSet` not reset across waves blocks board clear
- **File:** `scoreManager.ts:141` (used by both paths)
- **Problem:** Per-player word dedup set persists across wave advances. Same word appearing on wave N+1 that player found on wave N is silently rejected — no score, no tile contribution. Can prevent final board clear if required paths repeat earlier words.
- **Repro:** Player finds "STAR" wave 1; "STAR" exists wave 2; submission rejected; tile never cleared.
- **Fix:** Reset `game.playerWordsSet[username]` and `game.playerWords[username]` during wave advance (or key per-wave).

### L1 — `blastEnd` timer not cleared by `endGame`
- **File:** `gameEnd.ts:61`
- **Problem:** `clearGameTimer(gameCode)` clears only `game:${gameCode}`, not `blastEnd:${gameCode}`. If the game-timer expires while blastEnd is pending, endGame runs twice (second run is guarded but re-executes cleanup).
- **Fix:** `timerManager.clearTimer('blastEnd:${gameCode}')` inside `endGame`.

### L2 — `recordFirstFinder` check-then-set non-atomic
- **File:** `scoreManager.ts:417`
- **Problem:** Human+bot submitting same word same tick — both see `firstFinderMap` empty, both call record, both emit "first finder" UI locally, only one persists.
- **Fix:** Gate `botWordFound`/`wordAccepted` first-finder flag on the return value of `recordFirstFinder` (only true for the writer that won).

## Priority Order for Fixes
1. H2 (concurrency race — highest blast-rarity correctness risk)
2. H3 (endGame delay — user-visible symptom possible)
3. M3 (stale letterPositions — now observable with C3's per-wave grids)
4. M4 (word dedup across waves — user-visible: "why won't my word submit?")
5. M1 (bot resync race — narrow window but measurable wrong scoring)
6. M2 (variance ceiling — quality-of-behavior, not correctness)
7. L1, L2 (cleanup)

## Conventions
- TDD: RED → GREEN → REFACTOR per fix
- Commits direct to master, conventional commit format: `fix(blast): <what> (H2)` etc.
- Run `npm run test:backend && npm run lint` before each commit
