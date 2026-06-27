# Word Hunt — scoring fairness + celebration + intuitive cue + insights

> Goal: stop punishing fast solvers, celebrate Wordle-style on early finds, make the
> "find words → reveal clues → solve target" loop obvious without a tutorial, and show
> real per-player "how to score more next time" insights.

## Problems (current behavior)
1. **Fast solve is punished.** Score ≈ Σ(board-word pts, 2/letter) + finder-rank bonus
   ([20,12,8,5]). Solving the target ends the round (MP: 3s later). A player who solves on
   guess 1–2 farmed few words → low total. A slow farmer outscores the skilled fast solver.
2. **Flat celebration.** `WordHuntGameOverOverlay` shows the same trophy/particles whether
   you solved on guess 1 or 6. No Wordle-style escalation.
3. **Rules unclear.** Players don't realize they must spell board words to reveal target
   clues. Tutorial card (`WordHuntQuickRules`) auto-dismisses and is ignored. The
   misconception surfaces exactly when a player fires a target-length guess with **0 words
   found**.
4. **No real insight.** `getWordHuntTip` gives survival tips, not point-maximization levers,
   and ignores guess efficiency.

## Core mechanic: guess-efficiency bonus (serves #1 + #2 at once)
New pure fn `wordHuntEfficiencyBonus(attemptsToFind)` in
`shared/utils/wordHuntScoring.ts` — fewer same-length guesses to solve → bigger bonus.

Calibrated to farming yield (a strong farm run ≈ 12 words × ~5 letters × 2 = ~120 pts), so a
guess-1 solve with few words is genuinely top-tier on its own:

| attempts to find | bonus | Wordle-ish label |
|---|---|---|
| 1 | 140 | Genius |
| 2 | 95  | Magnificent |
| 3 | 60  | Impressive |
| 4 | 38  | Splendid |
| 5 | 22  | Great |
| 6+ | 12 | Phew |

Constants live in `wordHuntMultiplayerConstants.ts` (`HUNT_EFFICIENCY_BONUS` array) so they're
tunable. Bonus is **added on top of** word pts + finder-rank bonus, and folded into the bonus
returned by `recordTargetFound` so it rides the existing
`updatePlayerScore + addPlayerEventBonus` persistence path (scoringEngine recompute drops raw
score otherwise — see wordHuntHandler.ts:129-135).

Same fn used SP (client) + MP (server) → no client/server drift (Class-3 pitfall).

## Server: track per-player attempts (MP)
`huntState.playerAttempts[username]` — incremented on every **same-length** guess (right or
wrong) in `wordHuntHandler`. `recordTargetFound(state, username)` reads it to compute the
efficiency bonus. (`penalizeWrongGuess` currently tracks no counter.)

## Celebration tiers
Pass `attemptsToFind` into `WordHuntGameOverOverlay`. Guess 1 → "GENIUS!", extra particle
burst + crown/zap icon + rainbow vignette; guess 2 → "MAGNIFICENT!"; 3–4 → current trophy;
5+ → subdued. Labels via `t('wordHunt.celebrate.tierN')`.

## Intuitive cue (at the moment of the mistake — not a tutorial)
- **Empty clue state:** when 0 board words found, the clue boxes show a pulsing prompt
  "Spell words on the grid to reveal letters" so the affordance is visible during play.
- **Zero-word target guess intercept:** if a player submits a target-length guess having
  found 0 words, surface a one-shot contextual nudge: "Find words first — they reveal the
  hidden letters." Cheaper + sharper than redesigning onboarding.

## Insights (point-maximization, not just survival)
- Extend `WordHuntTipInput` with `attemptsToFind`.
- Reframe `getWordHuntTip` toward **points**: e.g. solved-fast-few-words → "Nice solve in N!
  Farm a few words next time for clue power + bonus points." Slow solve → "You had the clues
  — trust them and guess sooner." Blind guessing → "Spell words first; each one reveals a
  letter."
- Results: small score breakdown (words + efficiency + finder = total) so the lever is legible.

## TDD targets (pure fns, mandatory)
- `wordHuntEfficiencyBonus(attempts)` — tier table + monotonic-decreasing + floor.
- `getWordHuntTip` — new attempts-aware branches.

## Files
- NEW `shared/utils/wordHuntScoring.ts` (+ test)
- `shared/constants/wordHuntMultiplayerConstants.ts` (+ HUNT_EFFICIENCY_BONUS)
- `backend/modules/wordHuntManager.ts` (recordTargetFound reads attempts)
- `backend/handlers/wordHuntHandler.ts` (track playerAttempts, pass attempts)
- `shared/types/socket.ts` (playerAttempts on WordHuntModeState; attemptsToFind on result)
- `components/wordhunt/WordHuntGameOverOverlay.tsx` (celebration tiers)
- `components/daily/survival/SurvivalClueBoxes.tsx` (empty-state cue)
- SP survival win path (efficiency bonus + celebration) — per SP explore
- `components/results/getWordHuntTip.ts` + `WordHuntTipBadge`/`WordHuntResultsSummary` (insights)
- translations ×5
