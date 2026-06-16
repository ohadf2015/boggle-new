# Beta Modes Improvement Spec — Solo Daily Challenge layer

**Date:** 2026-06-16
**Author:** nightly/agent (goal: improve beta modes — fun, gaps, progress, monetization, graphics, music, variable rewards, modifiers)
**Council input:** gemini-3-flash-preview + grok-build (live web research: Wordle, NYT Games, Spelling Bee, WordHunt/GamePigeon, Squabble, Wordscapes)

## Problem

6 game modes are gated to admin + beta-testers (`canAccessInWorkMode`). **4 of 6 save nothing and earn nothing:**

| Mode | Persists | Earns coins | Daily seed |
|---|---|---|---|
| Shiritori (solo) | ❌ | ❌ | ❌ |
| Sealed Bid | ❌ | ❌ | ❌ |
| Word Alchemy | ❌ | ❌ | ❌ |
| Crossword | partial (localStorage resume) | telemetry only | ✅ already |
| Word Tower | ✅ Supabase + leaderboard | — | — |
| Word Forge | ✅ Supabase | — | — |

The economy already exists and is unused by these modes: `utils/coinManager.ts`
(`awardGameCoins`, `awardDailyCoins`, streak-tier bonuses, 500-cap), streak tiers
(`lib/streakTierRewards.ts`), daily rewards (`lib/dailyRewards.ts`), cosmetics
(`lib/cosmetics.ts`), reward HUD (`components/animations/CoinRewardHud.tsx`), juice
(`utils/confettiUtils.ts`, `components/game/ScreenFlashOverlay.tsx`), SFX
(`contexts/SoundEffectsContext.tsx`), music (`contexts/MusicContext.tsx`).

## Council research synthesis (what successful word games do)

- **NYT Games / Wordle:** fixed daily reset = ritual + FOMO; visible streak; shareable
  score image = social flywheel; multi-game portfolio retains better; free core, paid archive.
- **Wordscapes:** bite-sized Daily Goals (24h window, 1 swap/day) + month-long seasonal
  prize track; consumable power-ups that feel like skill amplifiers; rewarded video that is
  generous, never required; cosmetics + events for variable dopamine.
- **GamePigeon WordHunt:** social virality + short high-tension sessions + replay-vs-friend.
- **Squabble:** pressure + spectatorship turns a solitary loop into a social spectacle.

**LexiClash translation (brand = free, no pay-to-win, quirky neo-brutalist):** every mode
feeds ONE daily-challenge + streak + coin economy; hints/power are time-savers or cosmetics
only, never win-gates; TV/party = first-class big-target spectator breakpoint; Hebrew RTL
correctness throughout.

## Top 3 highest-impact / lowest-effort wins (both providers converged)

1. **Daily seed for the session-only modes** → shared daily puzzle = Wordle "watercooler"
   ritual + comparable result + streak hook. (this spec, phase 1)
2. **Wire all modes into the existing coin economy + a reward card** → progress + monetization
   + variable rewards with near-zero new infra. (this spec, phase 1-2)
3. **Brutalist shareable highlight card** per mode → viral retention. (follow-up; modes already
   have share cards — `SealedBidShareCard`, `AlchemyShareCard` — to be unified later)

## Design — Solo Daily Challenge layer (this session)

A small **pure, framework-free** core + one **reusable reward card**, wired into session-only
modes one at a time. No new Supabase table (rules: never publish a realtime table without a
consumer; coins persist via existing `coinManager` localStorage — **local only, not cross-device**,
parity with the existing daily challenge).

### `lib/solo/soloDaily.ts` (pure)
- `getSoloDateISO(now = new Date()): string` — UTC `YYYY-MM-DD`, the daily reset boundary.
- `soloSeed(mode, dateISO): number` — deterministic 32-bit hash (FNV-1a) of `mode|date`.
- `seededRandom(seed): () => number` — mulberry32 PRNG (pure, reproducible).
- `pickDailyModifier(mode, dateISO): SoloModifier` — deterministic daily mutator from a
  per-mode list (the "modifier" pillar). e.g. Shiritori "long words 2×", Sealed Bid "clash = 0",
  Alchemy "double catalyst". `{ id, labelKey, descKey }` — labels via `t()`.

### `lib/solo/soloReward.ts` (pure)
- `computeSoloReward({ mode, score, won }): { coins, breakdown, bonus }` — explicit per-mode
  score→coin mapping (built on `coinManager` constants), plus a **variable bonus roll** seeded
  per day so it's deterministic and not exploitable by reload. Word Alchemy synthesizes a score
  from heat; Crossword from time + hints. Each mapping is its own tested function.

### `awardSoloDaily(mode, dateISO, language, score, won)` (in `lib/solo/soloDaily.ts`)
- Idempotency key mirrors `awardDailyCoins`: `lexiclash_solo_daily_${mode}_${dateISO}_${language}`.
  First completion of the day awards `computeSoloReward` coins via `coinManager.addCoins`;
  replays the same day are **practice** (no re-award) — exactly the existing daily-challenge contract.
- Returns `{ awarded, breakdown, bonus } | null` (null = already claimed / zero reward).

### `components/solo/SoloRewardCard.tsx` (reusable, tested)
- Props: `{ coins, bonus, modifier, isPracticeReplay, onShare?, onPlayAgain, onBack }`.
- Shows coins earned (rolling `CoinRewardHud` style), the surprise **bonus** flourish, the
  day's **modifier** badge, a "come back tomorrow" line when already claimed, neo-brutalist
  shadows. All strings via `t('solo.*')`. Fires existing confetti + coin SFX on mount.

### Wiring order (one fully green before next)
1. **Sealed Bid** — `totalScore`, clean `phase === 'done'` end card. Reference integration. ✅ DONE
2. **Shiritori solo** — `score`, `phase !== 'playing'` end card (lang fixed to `ja`). ✅ DONE
3. **Word Alchemy** — `alchemyScore(heat, maxHeat)` synth on puzzle win. ✅ DONE
4. (follow-up) Crossword — already daily-seeded + has an `onSolved` hook + telemetry;
   add the coin award there using `crosswordScore(elapsedMs, hints, words)` (synth already
   built + tested). Deferred: its solved flow is bespoke (hook → pageClient → CrosswordView modal).

## Per-mode improvement backlog (council, for follow-up sessions)

- **Shiritori:** bot personality/taunts + escalating "heat"; risky-continuation multiplier;
  dramatic fail (bot "steals" last letter); kinetic impact typography; rare-link starter token.
- **Sealed Bid:** "ghost rivals" = last N players' real bids on the seed; market-tension meter;
  gavel/clash stamp juice; "Insider Info" hint as cosmetic/earned.
- **Word Tower (flagship):** magnetic crane snap + preview ghost + undo; expressive rival
  sabotage visuals; perk fragments → craft rare perks; expand daily mutators.
- **Word Forge:** Balatro-style passive "relic" runes; flavorful readable boss weaknesses;
  rune compendium; forge-heat risk/reward.
- **Word Alchemy:** discovered-reactions compendium = meta hook; heat distorts UI (GLSL/CSS);
  catalyst packs (cosmetic word-banks); mystery catalyst variable reward.
- **Crossword:** streak calendar + emoji-grid share; theme days; "check vs reveal"; archive
  vault (battle-pass / paid); RTL Hebrew grid care.

Shared follow-ups: unified Daily Goals + seasonal quest track (Wordscapes); cross-mode
PowerBank (hints/freezes/rerolls) with generous rewarded economy; unified brutalist share card.

## Out of scope (this session)
New Supabase tables, IAP/store UI, battle pass, leaderboards for solo modes, native verification.

## Verification plan
Unit tests (pure libs) + component test (reward card) + 5-lang i18n + `npm run lint` +
`npm run build`. **Not** in-game live-verified (local `:3000` runs prod build w/o testids).
