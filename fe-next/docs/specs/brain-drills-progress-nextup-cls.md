# Brain Drills: layout-shift fix + "next up" prompt + progress feedback

Status: in progress — 2026-05-23

## Problems (reported by founder)

1. **No "play another game" prompt** after finishing a drill round (lightning-round
   and the rest). After 1–2 rounds the only choices are Play Again (same drill) or
   Exit (to hub). Daily challenge is named as an example of another game worth
   suggesting.
2. **Grid shifts on every word submit.** The playing-phase column is vertically
   centered; the "recent words" list is conditionally rendered (`{len > 0 &&}`) and
   uses `max-h-*`, so it appears at 0px and grows → centered grid re-centers (jumps).
3. **No sense of progress / "getting better."** Player should feel improvement over
   time. Surface the most flattering *true* metric each run.

## Approach (3 phases, TDD, commit per phase, Phase 1 ships first)

### Phase 1 — kill the layout shift (frontend only, no backend/i18n)
- Offenders: `LightningRound` (recent-words `max-h-28` + conditional), `RareGems`
  (found-words `max-h-32` + conditional). Secondary: `MemoryHunt` target-words list
  (grows below grid, parent still `justify-center`).
- Fix: render the words box **always** at a **constant height** (`h-28`/`h-32`, not
  `max-h`), scroll internally (`overflow-y-auto`). Empty state shows a faint
  placeholder hint (same height, no blank bordered box).
- Reserve a constant-height feedback slot where the feedback message toggles.
- Regression test: words box renders with 0 words and carries the fixed-height class
  (guards against re-introducing conditional/growing list).

### Phase 2 — "next up" prompt (frontend + i18n)
- New pure `lib/drills/nextDrill.ts`: canonical drill order + unlock gates
  (lightning/memory/combo = 0, pattern = 5, rare = 10) → next **unlocked** drill,
  rotating, skipping current. Fallback to the zero-gate set if unlock count unknown.
- New shared `components/drills/DrillCompleteActions.tsx`: Play Again · **Next: <drill>**
  · Exit, plus a secondary **Daily Challenge** link. Self-contained (`useRouter`,
  `useLanguage`); takes `currentDrillId`, `onPlayAgain`, `onExit`.
- Swap the footer in all 5 `*CompletePhase` components to use it.
- i18n ×5: `brain.drills.nextDrillCta` ("Next: {drill}"), `brain.drills.dailyChallengeCta`.
- Tests: `computeNextDrill` (rotation / unlock-skip / wrap / fallback); component renders
  the actions and routes on "next".

### Phase 3 — progress / "getting better" (backend + types + overlay + 5 PageClients + i18n)
- `processCompletion`: from the already-fetched prior `drill_progress` snapshot, compute
  `personalBest { isNew, previousBest, avgScore, currentScore, totalPlays }`. First play
  (`priorTotalPlays === 0`) is NOT a personal best. Add a `drill_sessions` query
  (ORDER BY created_at DESC LIMIT 2) for `lastSessionScore` → `improvedVsLast`.
- Thread through `useSaveDrillResult` → PageClient state → `DrillProgressionOverlay`.
- Overlay shows the single most flattering true signal, in priority order:
  1. 🏆 New personal best  2. ↑ Above your average  3. ↑ Better than last time
  (existing domain `scoreDelta` badge stays).
- i18n ×5: `brain.drills.newPersonalBest`, `brain.drills.aboveAverage`,
  `brain.drills.betterThanLast`, `brain.drills.firstAttempt`.
- Tests: personal-best logic (first play / beat best / below best); overlay badge.

## Out of scope
- Per-metric PB tracking in `drill_progress` schema (compute from sessions, no migration).
- Daily-challenge "already played today" gating (link shown unconditionally for v1).
