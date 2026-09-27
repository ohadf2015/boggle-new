# Adventure: board-tuned thresholds + word rarity (2026-09-20)

## What was wrong

Post-rebuild completions on 2026-09-20 averaged **2.90 of 3.00 stars** over 21 runs.
Measured player throughput in those runs:

| Board | Best score / 90 s | Words |
|---|---|---|
| 4×4 (worlds 1–3) | 1217 | 12.3 |
| 5×5 (worlds 4–10) | 1072 | 8.0 |

Against that, the **hardest three-star gate in the entire game was 910** — every
ceiling sat below an average run. Three causes:

1. **A linear curve against exponential word scores.** `one = (60 + (world-1)·12 +
   (level-1)·8) · sizeFactor` climbs ~5× across 70 levels while a single word ranges
   10 → 500 points (`getBaseScore`). One long word could three-star a late level.
2. **Board variance was ignored.** Over 150 dealt boards per size, total solvable
   score spreads **6.3× between p10 and p90**. A fixed threshold is trivial on a rich
   board and unfair on a poor one — the "unachievable" complaint.
3. **Combat inherited both.** `enemyHp` is cut from `stars[1]`, so elite and boss HP
   carried the same flat curve.

## What changed

**Thresholds are now re-derived from the board actually dealt.**

```
par    = PAR_K[size] · √(total solvable score of THIS board)
one    = par · (0.22 → 0.40 across the 70-level ladder)
stars  = buildSpec(..., one)      ← the SAME authored builder
```

`tuneToBoard()` feeds that `one` back through the existing `buildSpec`, so the
hand-authored design in `WORLD_ROWS` is untouched: kind multipliers (`chain` 0.6,
`hunt` 0.7, `fog` 0.8 …), per-world twists, the `rush`/`finale` clocks and the
1.8 / 2.8 star steps all still apply. Only the magnitude changes — and because
`enemyHp` is cut from `stars[1]`, combat is rebalanced by the same act.

**The `√` is load-bearing.** It compresses board spread from 6.3× to ~2.4×, so a
vowel-poor deal can no longer wall a player while a rich one no longer hands out
free stars. `PAR_K` is per board size (4 → 20, 5 → 10.5, 6 → 8): the *bigger* board
takes the *smaller* constant, because player output is bounded by the clock, not by
board richness — a 5×5 holds ~2.6× a 4×4's solvable score but nobody finds
proportionally more.

The solve happens at `/start` (the solver already ran there for hints and hunt
targets) and the tuned thresholds are **signed into the attempt token** as `st`/`eh`,
so the client cannot lower its own bar and `/complete` never re-solves. Tokens
without them fall back to the static table.

### Resulting ladder, on median boards

| | 1★ → 3★ | was | 3★ as % of a real run | enemy HP |
|---|---|---|---|---|
| W1 L1 classic | 345 → 965 | 60 → 170 | 79% | |
| W1 L7 boss | 370 → 1035 | 110 → 310 | 64% | 200 → 665 |
| W5 L4 elite | 405 → 1135 | 200 → 560 | 95% | 290 → 585 |
| W10 L4 elite | 525 → 1470 | 290 → 810 | 123% | 415 → 755 |
| W10 L7 boss | 535 → 1500 | 325 → 910 | 105% | 585 → 965 |

Clearing (1★) stays at 230–535 everywhere — well inside a real run, on every kind —
while 3★ now costs 64–123% of one. Boss HP rises ~1.65×, a measured step rather than
a shock.

## Word rarity

`calculateWordScore` already accepted a `rarityMultiplier` that adventure passed as
`1`. `wordPoints(word, language)` now feeds it
`getRarityMultiplier(getWordRarity(word))` — common 1.0 → epic 2.0 — so `quartz`
outscores `raised` at equal length. Rarity is a pure function of the word, so the
server re-derives exactly what the HUD showed.

**Latin scripts only (en/es/sv).** `LETTER_RARITY` in `shared/utils/wordFrequency.ts`
maps A–Z; for he/ja/ru every letter scores 0 and only the `(len−4)·2` length bonus
would survive, which would pay for length twice on top of an already exponential
base score. Those languages get a flat 1.0.

`language` is bound once inside `scoreWords`, the single place base points are
produced and the one function both the HUD and the server settle reach — so the two
cannot drift (the repo's Class 3 "asymmetric paths" pitfall). Par is computed with
the same scorer on the same board, so targets self-normalise per language.

> ponytail: heuristic rarity (letters + length). Upgrade path is the real
> player-frequency corpus already powering `backend/modules/wordFrequencyBanding.ts`.

## Not changed, deliberately

The enemy already fights back: `combat.ts` runs a two-sided real-time fight with
player HP, telegraphed attacks on a per-world cadence, and death. Speed already
matters through that cadence pressure and `bossStarsForElapsed`. Both were verified
on this branch before any work was written; no second rival mechanic was added.

## Calibration

`PAR_K` and the 0.22 → 0.40 ramp come from 150 dealt boards per size, solved with the
shipped dictionary and scored with the rarity-aware scorer. Re-measure with
`npx tsx scripts/adventure-calibrate.ts` after any change to the word-score table or
the letter distribution.

**Caveat on the human baseline:** 1217 / 1072 come from 21 runs by 11 users against
targets low enough that nobody had reason to push. Treat it as a *floor on capability*,
not a measurement of it — which makes the late-game percentages above conservative.
Retune from real runs once the new thresholds have data behind them.
