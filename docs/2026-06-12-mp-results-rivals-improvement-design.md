# MP Results: Rivals + Improvement panels (all modes)

**Date:** 2026-06-12
**Goal:** Improve the multiplayer result page for *all* modes around the two things the player cares about most — **success against rivals** and **personal improvement** — using impeccable design rules, framer/gsap motion, and a focused Pixi accent.

## Problem (grounded in code)

Shared MP results = `ResultsPage.tsx` → `ResultsMainContent.tsx`. Every mode (classic, blast, wheel-rush, word-hunt, …) renders `ResultsMainContent` *alongside* its mode-specific scene, on both mobile + desktop. So `ResultsMainContent` is the one true shared slot.

Today `ResultsMainContent` shows: Hero → Highlights → (Share/Rewards) → Podium → Series → Revenge(1v1 vs winner) → Details. Gaps vs the user's priorities:

1. **Rivals are shallow.** Only a single 1v1 "Revenge/Defend" card vs the *winner*. The rich `selectClosestRivals` engine (signed deltas, true global rank, closest neighbours) drives in-game chips/rails but was **never wired into results**. `ComparativeInsights` (aggregate vs-average) is **dead code (0 consumers)**.
2. **Improvement is invisible on results.** `xpGainedData` (server-authoritative: `xpEarned`, breakdown, `newLevel`, `newTotalXp`) and `levelUpData` flow over the socket into `ResultsPage` but are **not passed to `ResultsMainContent`**. `winStreakData` is passed but only shown as a thin badge. localStorage history (`gameHistoryManager`) tags mode only as `single|multiplayer|daily` → cross-mode score scales make "personal best for this mode" **meaningless**, so we do NOT use it.

## Design

Two new shared sections inside `ResultsMainContent`, placed right after the Hero/Highlights (you-first), before the generic Podium. They render for every mode/viewport via the single shared component.

### 1. RivalsPanel — "You vs Rivals" (the success payoff)
- Source: `sortedScores` (Player[]) → new pure `playersToRivals()` normalizer → `selectClosestRivals(rivals, 3)`.
- Shows: your **true global rank** big ("#2 of 6"), then up to 3 closest rivals as rows with signed deltas — "you beat **Bob** +12", "**Alice** ahead +5" — directional color (lime = ahead/beat, pink = behind).
- A **gap bar**: horizontal bar per rival showing |delta| relative to the lobby score spread, so "how close" is visceral. Animated fill (ease-out, reduced-motion: instant).
- Win state: when you're ahead of your closest rival, a small **Pixi spark burst** fires once (reduced-motion gated), reusing the sparks pattern.
- Absorbs `ComparativeInsights`'s one honest line ("you found N words nobody else did") when word data exists — kills the dead component.
- Solo/2-player edge: `selectClosestRivals` returns null for solo → panel renders nothing.

### 2. ImprovementPanel — "Your Progress" (the improvement payoff)
- Source (server-authoritative only): `xpGainedData`, `levelUpData`, `winStreakData`. Threaded through `mainContentProps`.
- Shows: **XP earned this game** (count-up), a **level progress bar** (progress within `newLevel` derived from `newTotalXp`), **win streak** with flame when ≥2, and a level-up flourish when `levelUpData.levelsGained > 0`.
- Honest fallbacks: guests / no-XP → show streak only if present, else render nothing (no empty shell, no fake numbers). No cross-mode PB claims.

### Pure selectors (TDD first)
- `lib/leaderboard/rivalNormalizers.ts` → add `playersToRivals(players, username)` (Player[] → RivalInput[]).
- `lib/results/selectImprovementSummary.ts` → `(xp, levelUp, streak) → { xpEarned, levelProgressPct, level, streak, leveledUp } | null`. Pure, honest fallbacks, returns null when nothing reliable to show.

### Design rules applied (impeccable)
- **No side-stripe borders** (the existing Revenge card's `border-l-4` is the banned pattern; new panels use full `border-neo` + bg tint).
- Neo tokens only; lime=ahead/win, pink=behind/rival, yellow reserved for XP/celebration, orange for streak fire.
- Contrast ≥4.5:1 (white/cream on neo-navy surfaces, black on lime/yellow).
- Motion: framer count-ups + gsap-free CSS bar fills, ease-out, staggered rival rows, full `prefers-reduced-motion` fallback. Pixi accent reduced-motion gated.
- RTL-safe (Hebrew): deltas use logical layout, no hard left/right.

### Wiring
- `ResultsMainContentProps`: add `xpGainedData?`, `levelUpData?` (winStreakData already present).
- `ResultsPage` `mainContentProps` (L845): pass `xpGainedData`, `levelUpData`.
- Insert `<RivalsPanel>` + `<ImprovementPanel>` in `ResultsMainContent` after Highlights, before Podium. Not gated by `hideStandings`.
- i18n: `results.rivals.*`, `results.progress.*` ×5 languages.

### Out of scope
- No rewrite of Blast/Wheel/WordCraft scenes. No backend changes. No per-mode PB persistence (would need schema).
```
