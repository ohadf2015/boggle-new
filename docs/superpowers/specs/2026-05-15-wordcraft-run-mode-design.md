# WordCraft Run Mode — Design Spec

**Date:** 2026-05-15
**Status:** Approved design, ready for implementation plan
**Author:** brainstorming session

## Problem

WordCraft today is a full Scrabble clone: 13×13 board, 7-tile rack, locale-aware tile-bag
distribution, bingo bonus, swap/pass, premium squares, cross-word scoring, a permutation-search
bot opponent, **and** a Heat→Overdrive→Burnout layer already bolted on top. User feedback:
still "too heavy" and "too complex." The tile-placement core feels good; everything around it
is weight.

The previous twist (Heat system) failed to lighten the mode because it *added* rules to the
Scrabble base rather than replacing the base. The heaviest single element is the **bot** — it
forces turn-taking, think-time downtime, and roughly half the reducer's complexity.

## Goal

Rework WordCraft into a **solo, run-based word game** with a roguelike power-card twist —
lighter, faster, more modern, more fun. Keep the tile-placement core; strip the Scrabble
scaffolding; replace it with a short-run loop.

Non-goals: multiplayer, persistence/leaderboards, a smarter bot, daily-puzzle format.

## Design Rationale (interpretation note)

"The basic is working well" is read as: *keep the place-tiles-on-a-grid core; simplify
everything around it.* The chosen direction — roguelike run with power cards — is modeled on
the 2026 breakout "Beyond Words" (Balatro-meets-Scrabble). Rejected alternatives: a daily blitz
puzzle (lighter but no "fun twist," low replay) and lightening Scrabble-vs-bot in place (stays
in the same trap). If this interpretation is wrong, the cheapest correction point is this spec.

## Core Loop

A **run** = 3 rounds, played solo against escalating score targets.

```
Run start
  └─ Round 1  → play → hit target? ── no ──→ Run over (results)
        └─ yes → pick 1 of 3 power cards
  └─ Round 2  → play → hit target? ── no ──→ Run over (results)
        └─ yes → pick 1 of 3 power cards
  └─ Round 3  → play → hit target? ── no ──→ Run over (results)
        └─ yes ───────────────────────────→ Run cleared (results)
```

Each **round**:
- Small board: **7×7 on phone, 9×9 on tablet+** (locked at round init from viewport, mirrors
  existing `getBoardDims` adaptive pattern).
- A rack of 8 tiles, refilled from a **small round bag** (round 1: 20 tiles, round 2: 24,
  round 3: 28 — sizes are tuning constants).
- A **score target** for the round (see Difficulty Curve).
- Player places words crossword-style (first word free-placed; subsequent words must connect —
  reuse existing `moveValidator`). Each committed word scores immediately.
- Round ends when the player taps **End Round**, or when no remaining tile can be legally
  placed (bag + rack exhausted of playable tiles).
- Round score ≥ target → advance + card pick. Otherwise → run over.

No bot. No turn-taking. No heat/overdrive/burnout. No swap. "Recall pending tiles" stays
(needed to undo placement before commit). No central bingo bonus — its role is taken by power
cards like "Long Game."

## Scoring — Chips × Multiplier

Replaces raw Scrabble points with a Balatro-style two-number model. One satisfying product is
easier to feel than premium-square arithmetic.

- **Chips** = sum of letter values, with premium-square letter multipliers applied
  (DL ×2, TL ×3 on the letter — same as today's `scoreWord` letter logic).
- **Mult** = starts at the word-multiplier from premium squares (DW ×2, TW ×3), then modified
  by active power cards.
- **Word score = chips × mult.**
- Round score = sum of word scores.

`scoring.ts` is extended: `scoreWord` returns `{ chips, mult, total }` instead of a bare
number. A new `applyCardEffects(base, cards, context)` folds active power cards into chips/mult
before the final product. `scoreTurn` / `BINGO_*` are removed from the run path (left intact in
the legacy path until that path is deleted — see Rollout).

## Power Cards

After clearing a round, the player picks **1 of 3** cards drawn from a pool. Cards **stack** and
persist for the rest of the run. Each card has a rarity (common / rare / legendary) reused for
visual tiering (`scoreDotTier` color convention).

Initial pool (~12 cards, final set tuned during implementation):

| Card | Rarity | Effect |
|---|---|---|
| Vowel Power | common | Vowels give +2 chips each |
| Long Game | common | Words ≥5 letters: ×2 mult |
| Combo | common | Each word after the 1st in a round: +1 mult (cumulative within round) |
| Premium Hunter | rare | Each premium square used: +1 extra mult |
| Wildcard Stash | common | Start each round with 1 blank tile in rack |
| Quick Hands | common | +4 tiles in the round bag |
| Double Down | rare | First word each round: ×3 mult |
| Rare Letters | rare | Tiles worth ≥4 points give +3 chips each |
| Short & Sweet | common | 3-letter words: +15 flat chips |
| Steady Build | common | +5 flat chips per word |
| Overflow | legendary | Round score over target carries: +10% of overflow as bonus |
| Letter Hoard | legendary | Rack size 8 → 10 for the rest of the run |

Card effects are pure functions over `(scoreContext) → scoreModifier`, defined in `powerCards.ts`,
applied in `cardEffects.ts`. This keeps effects unit-testable in isolation.

## Difficulty Curve

`runTargets.ts` exposes `getRoundTarget(round, boardSize)`. Targets escalate so round 1 is
clearable by most players and round 3 demands good card synergy. Tuning constants live in one
place; exact numbers calibrated during implementation against playtest. Curve shape: round 1
generous, round 2 moderate, round 3 steep but reachable with 2 stacked cards.

A `?seed=` URL param produces a reproducible run (board bag + card draws), enabling shareable
challenges. Default = random seed per run.

## Architecture

### New — `lib/word-craft/run/`
- `runTypes.ts` — `RunState`, `RoundState`, `PowerCard`, `ActiveCard`, `RunPhase`
  (`'intro' | 'playing' | 'roundResult' | 'cardPick' | 'runResult'`).
- `runReducer.ts` — pure reducer: round advance, target hit/miss, card pick, run over,
  placement/commit/recall actions delegated to existing placement logic.
- `powerCards.ts` — card definitions + pure effect functions.
- `cardEffects.ts` — folds active cards into a score computation.
- `runTargets.ts` — escalating target curve + tuning constants.
- `useWordCraftRun.ts` — React hook wrapping `runReducer`, seeded RNG for bag + card draws.

### Reused unchanged or lightly extended
- `board.ts`, `placement.ts`, `moveValidator.ts`, `tileBag.ts` — reused. `tileBag` already
  supports `bagSize` scaling.
- `scoring.ts` — extended to `{ chips, mult, total }` (see Scoring).
- `pixi/` scene system — reused; new scenes added.

### New components — `components/word-craft/run/`
- `RunHUD.tsx` — round X/3, target vs current score, active card chips.
- `PowerCard.tsx` — single card (rarity-tiered, neo-brutalist).
- `CardPickScreen.tsx` — 3-card choice screen.
- `RoundResultScene.tsx` — hit/miss summary, advance CTA.
- `RunResultScene.tsx` — final run total, cards taken, shareable summary string.

### New Pixi scenes — `lib/word-craft/pixi/scenes/`
- `cardRevealPop.ts` — card-pick reveal.
- `multiplierPop.ts` — big chips×mult product pop on word commit.
- `targetHitBurst.ts` — round-target-cleared celebration.

### Modified
- `app/[locale]/word-craft/PageClient.tsx` — reworked to drive the run flow via the phase
  state machine. Target < 500 lines (CLAUDE.md hard limit) by delegating each phase to a
  section component.
- `useWordCraftGame.ts`, `botMove.ts`, heat/overdrive/burnout reducer logic — **left intact**
  behind the legacy path until the feature flag fully rolls out, then deleted (see Rollout).

### Feature flag
`useWordCraftRunFlag` — follows the `usePostHogFlag` / `useOfflineModeFlag` pattern. Dev
override env var defaults ON in dev; PostHog-gated in prod. `PageClient` branches: flag on →
run mode, flag off → legacy Scrabble-vs-bot.

## Data Flow

```
useWordCraftRun (hook)
  ├─ seeded RNG ──→ tileBag.createBag(bagSize) ──→ round rack
  ├─ user places tiles ──→ placement.ts ──→ pending placements
  ├─ commit ──→ moveValidator ──→ words ──→ scoring.scoreWord
  │                                          └─ cardEffects.applyCardEffects(activeCards)
  │                                             └─ { chips, mult, total } ──→ round score
  ├─ End Round / no moves ──→ runReducer: compare round score vs runTargets.getRoundTarget
  │      ├─ hit ──→ phase 'cardPick' ──→ draw 3 from powerCards pool (seeded)
  │      │            └─ user picks ──→ activeCards.push ──→ next round
  │      └─ miss ──→ phase 'runResult'
  └─ round 3 hit ──→ phase 'runResult'
```

## Error Handling

- Pixi init failure (no WebGL) → PostHog event + degrade to DOM-only (existing pattern).
- Dictionary load failure → existing WordCraft handling, unchanged.
- Invalid word on commit → no score, no penalty, tiles return to pending (light-feel: misses
  never punish).
- `prefers-reduced-motion` → gates all new Pixi scenes at entry (existing convention).

## Testing Strategy

TDD mandatory (`.claude/rules/22-tdd-strict.md`). RED→GREEN→REFACTOR per behavior.

Vitest unit (lib/run logic — primary coverage):
- `powerCards` — each card's effect function in isolation.
- `cardEffects` — chips×mult folding with 0, 1, and stacked cards.
- `runTargets` — curve monotonically escalates; seed reproducibility.
- `runReducer` — round advance, target hit, target miss, card pick appends, run-over
  transitions, run-cleared on round 3.
- `scoring` — extended `scoreWord` return shape; premium logic unchanged.
- Seeded RNG — same `?seed=` → identical bag + card draws.

Component tests:
- `CardPickScreen` — renders 3 cards, selection appends + advances.
- `RunHUD` — target/score/card-chip rendering.

Pixi scenes: JSDOM smoke tests only (existing WordCraft convention) — visual correctness via
manual playtest.

## i18n

New `wordcraft.run.*` namespace, all 5 locales (en/he/sv/ja/es). Hebrew included per project
convention; HE/SV/JA/ES flagged "needs native review" in the commit. Keys cover: round labels,
target/score HUD, all card names + effect descriptions, round result, run result, share string.

## Rollout

1. Ship run mode behind `useWordCraftRunFlag`, legacy path intact.
2. Verify build + full test suite + lint green.
3. After flag confirmed stable in prod, a follow-up PR deletes `botMove.ts`, heat/overdrive/
   burnout reducer logic, the legacy `useWordCraftGame` Scrabble path, and `BINGO_*` from
   `scoring.ts`. No backwards-compat shims kept.

## Open Tuning Items (resolved during implementation, not blockers)

- Exact round bag sizes and score targets — calibrated via playtest.
- Final card pool count and individual numbers.
- Whether "End Round" needs a confirm step.
