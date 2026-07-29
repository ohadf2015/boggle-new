# MP Blast — Timer Model, Bot Fix & Results Redesign

**Date:** 2026-05-14
**Status:** Design — pending user review

## Problem

MP Blast mode is the odd one out among MP modes:

1. **Ends on board-clear, not time.** Blast runs a 3-wave board-clear progression; the shared timer is only a fallback. Every other MP mode (Classic, WheelRush, WordHunt) is a fixed countdown. This makes Blast feel like a puzzle with steps rather than a timed race, and force-overrides the host's chosen timer (`gameStartHandler.ts:300-306`, audit SRV-M4).
2. **Bots go idle.** Players have observed bots sitting still / scoring 0 in Blast games.
3. **Results page is weak.** `BlastBoardDomination` / `BlastResultsSummary` show stale or unflavored stats (`movesUsed`) and lack celebratory presentation.

## Assumptions (confirm at review)

- **A1** — The new `BlastResultsScene` fully replaces both `BlastBoardDomination` and `BlastResultsSummary` for MP Blast. (User did not explicitly confirm; flag if wrong.)
- **A2** — Results stats list below is complete; nothing additional Blast-specific is required. (User did not explicitly confirm.)

## Decisions

- **End model:** Pure timer. No waves, no board-clear win condition.
- **Board clear mid-game:** Instant refill + clear-bonus. Board + overlay regenerate in place, play continues until the timer ends.
- **Timer length:** Blast respects the **existing general MP timer setting** (`AdvancedSettingsModal`, 1/2/3 min chips). No new Blast-specific UI. Server default stays **90s** (`BLAST_MP_DEFAULT_TIMER`) when no valid timer is supplied.
- **SRV-M4 tradeoff (explicit):** The current force-override exists because Blast combo math was balanced for a fixed 90s window. User has chosen to override that directive and respect host choice. With waves removed and continuous refill, the fixed-window balance argument is weaker — but this is a deliberate accepted tradeoff, not an oversight.
- **Results:** New `BlastResultsScene`, Blast-flavored (electric/explosive), animated via `/animate-ai` patterns — distinct from the generic podium, comparable polish to `WheelRushResultsScene`.

## Part 1 — Pure timer, no waves

### Server

- `shared/constants/blastMultiplayerConstants.ts` — remove `BLAST_MP_DEFAULT_MAX_WAVES`. Keep `BLAST_MP_DEFAULT_TIMER = 90`.
- `backend/handlers/gameStartHandler.ts` (~300-306) — **remove the Blast force-override**. Blast flows through the generic timer pipeline (clamped 30–600s). When `timerSeconds` is missing/invalid for Blast, fall back to `BLAST_MP_DEFAULT_TIMER` (90) instead of the generic 120.
- `backend/handlers/wordValidationHandler.ts` (~140-190) — replace wave-advance / endGame-on-clear with **regenerate-in-place**: on `isBlastBoardCleared`, award a clear-bonus, regenerate board + overlay, broadcast `blastBoardUpdate`, **do not** end the game or advance a wave counter. Game ends only when the shared timer hits 0.
- `backend/modules/blastModeManager.ts` — repurpose `advanceBlastWave` → `regenerateBlastBoard` (fresh overlay from a new seed, no wave increment). `isBlastBoardCleared` unchanged.
- **Bot resync on refill (critical):** `resyncBotsForNewGrid` currently runs on wave-advance. The new refill path **must** call it on every board regeneration, or bots' word pools go stale. List item in the implementation checklist.
- `backend/services/gameLifecycle/gameTimer.ts` — no change needed; Blast already rides the shared timer. Verify Blast games receive `timerSeconds` at creation.

### Client

- Remove wave indicator + move-counter UI from the Blast MP view. Show the standard shared timer pill (same component Classic/WheelRush use).
- `shared/types/game.ts` `blastModeState` — stop gating on `playerMoves` / `playerBonusMoves`. Retain lightweight per-player stat counters (score, combo, gems, board clears, tiles cleared, best word) for the results page.

## Part 2 — Bot idle bug

Reproduce before fixing (systematic-debugging). Two hypotheses to distinguish — symptom "idle/not scoring" matches both:

- **H1 — bots not emitting:** word pool empty or submission loop stalled (likely tied to the board-clear/wave path not resyncing).
- **H2 — bots emitting but zeroed:** `shouldBotScore` returns 0, so a working bot still looks idle.

Reproduction must log **word emission** and **credited score** separately, not just final score. Fix the actual root cause; don't assume. The resync-on-refill item in Part 1 is the most likely H1 culprit but must be confirmed, not presumed.

## Part 3 — Results redesign

New component `components/results/BlastResultsScene.tsx`, replacing `BlastBoardDomination` + `BlastResultsSummary` in `ResultsPage.tsx` (~176-189).

### Stats shown (timer-era; `movesUsed` dropped)

- Final score — ranked per player (podium)
- Best combo chain (max cascade multiplier)
- Gems collected
- Board clears (count — now a bonus event, not a game-end gate)
- Tiles cleared (total)
- Best word

### Feel

- Staggered stat reveals, cascade-themed fx, combo count-up, gem-tally pour.
- Electric/explosive Blast coding — distinct from the generic podium, polish on par with `WheelRushResultsScene`.
- Built with `/animate-ai` patterns (skill invoked during implementation).
- Reduced-motion guard required.

## Testing

- **Part 1:** server tests — Blast respects host timer, falls back to 90s, ends on timer not board-clear, board regenerates + rebroadcasts on clear with no wave increment. Update/replace `botGame.blast.test.ts` wave-advance tests.
- **Part 2:** regression test reproducing the idle bug (asserts bots emit words AND receive credited score over a Blast game); test that refill triggers bot resync.
- **Part 3:** component tests for `BlastResultsScene` — renders all stats, ranks correctly, reduced-motion path.
- 5-locale i18n for any new strings (HE/SV/JA/ES native review pending per project norm).

## Out of scope

- Single-player Blast (this is MP-only).
- Blast access gating (`blast_access` flag) — unchanged.
- Theme images / curated level packs.
