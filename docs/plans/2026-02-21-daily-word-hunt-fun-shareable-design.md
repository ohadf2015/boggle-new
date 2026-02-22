# Daily Word Hunt — Fun & Shareable

**Date:** 2026-02-21
**Approach:** Hybrid (C) — URL-encoded gauntlet + cinematic win moment + emoji share card

---

## Problem

The daily word hunt is functional but not viral. Share button exists but produces no brag moment. No challenge mechanic. Game feel is flat (no juice on word found).

## Goals

1. Make winning feel genuinely exciting (cinematic, earned)
2. Make the share card visually distinctive and brag-worthy
3. Add "Beat my score" challenge mechanic with zero new backend

---

## Architecture

Four independent layers, each shippable on its own:

```
1. In-Game Juice       → word-found sparkles, final-solve flash
2. Win Cinematic       → 2.5s Framer Motion reveal before results
3. Results Redesign    → emoji share card inline, emotional copy
4. Score Gauntlet      → URL-param challenge, pre-game banner
```

---

## Layer 1 — In-Game Juice

**Files:** `DailyChallengeGame.tsx`, `DailyWordHuntSurvival.tsx`

- Wire existing `ScorePopupFly` to word-found events
- Wire existing `SelectionSparkle` to tile selection
- On final solve: lime screen flash (400ms) → transition to WinCinematic

---

## Layer 2 — Win Cinematic

**New file:** `components/daily/WinCinematic.tsx`

- Framer Motion (not Remotion — no bundle cost)
- 2.5s sequence, auto-advances to results
- Score counter springs from 0 → finalScore
- "WORD HUNT #421" stamp bounces in
- Confetti via existing `ChainParticleBurst`
- "TAP TO CONTINUE" fades in at 2s

---

## Layer 3 — Results Screen Redesign

**New component:** `components/daily/results/EmojiShareCard.tsx`

Inline above share button. Wordle-style visual:

```
🟩🟩🟩🟩  CATCH  (+4)
🟩🟩🟩🟩🟩  LIGHT  (+6)
🟩🟩  AT  (+2)
⬛⬛⬛⬛  ????

Word Hunt #421 • 847pts
lexiclash.live
```

Missed words show length as `⬛` — reveals how close without spoiling the word.

**Emotional copy in `ResultDisplay`:**
- Top 10%: "Top 10% today 🔥"
- Top 25%: "Better than most 💪"
- Solved: "You got it! 🎯"
- Failed: "So close — try again?"

---

## Layer 4 — Score Gauntlet

**Share URL format:**
```
https://lexiclash.live/daily?challenger=ohad&score=847&avatar=🎯&date=2026-02-21&lang=en
```

**New component:** `components/daily/ScoreGauntletBanner.tsx`
- Reads URL params on `DailyChallengeLanding`
- Shows: "[Avatar] [Name] scored [score] — can you beat it?"
- Disappears after game starts

**`useShareHandlers` changes:**
- New `handleChallengeShare()` encodes params into URL
- Winners: primary CTA = "Challenge Friends →"
- Losers: secondary CTA = "Share Anyway"

**Share text (winners):**
```
I found 12 words and scored 847 in today's LexiClash Word Hunt 🎯
Think you can beat me? lexiclash.live/daily?challenger=...
```

---

## Components Summary

| Component | Status | Layer |
|-----------|--------|-------|
| `WinCinematic.tsx` | New | 2 |
| `EmojiShareCard.tsx` | New | 3 |
| `ScoreGauntletBanner.tsx` | New | 4 |
| `ScorePopupFly` wiring | Modify | 1 |
| `SelectionSparkle` wiring | Modify | 1 |
| `useShareHandlers` | Modify | 4 |
| `ResultDisplay` copy | Modify | 3 |
| `DailyChallengeLanding` | Modify | 4 |
| `ShareSection` CTAs | Modify | 4 |

---

## Constraints

- All UI text via `t('key')` — add translations for all 4 languages
- RTL support for Hebrew (`?locale=he`)
- Domain: `lexiclash.live` (not lexiclash.app)
- TDD: tests before implementation for all new components
- No new backend routes

---

## Team

- **Frontend Engineer** — Layers 1, 2 (game juice + cinematic)
- **UI Designer** — Layer 3 (emoji card, emotional copy, results redesign)
- **Game Designer** — Layer 4 (gauntlet mechanic, share copy, CTA strategy)
