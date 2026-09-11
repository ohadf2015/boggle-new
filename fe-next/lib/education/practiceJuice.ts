/**
 * practiceJuice — the payoff model for a finished solo practice round.
 *
 * Every practice mode used to end on a flat card: a trophy glyph, a percentage,
 * and a Try Again button. The only confetti in the entire practice stack fired
 * on a level-up, which most rounds never reach. So a student could play seven
 * different games and never once be told, in the language games use, that they
 * had *won* something.
 *
 * This module is the pure half of the fix. It turns a raw (correct, total) pair
 * into a celebration plan — stars, rank, which mascot reacts, which sound
 * stings, how loud the confetti gets — so every mode's end screen is scored by
 * exactly the same rules and can be unit-tested without a DOM.
 *
 * Two deliberate design calls live here:
 *
 *  - **One star is the floor.** Finishing a round is itself worth a small
 *    celebration; a student who got two of ten still gets a card that says
 *    "round complete", just with a quieter mascot and no confetti. Zero stars
 *    would be a punishment screen, and punishment screens do not get replayed.
 *  - **The stinger fires on arrival, not on every frame.** `streakFlameStage`
 *    reports `milestone: true` only on the exact streak value that first
 *    reaches a new flame stage, so a caller can play a sound on the transition
 *    without re-triggering it on every subsequent correct answer.
 */

import type { SoundEffectKey } from '@/lib/audio/soundEffectsConfig';

export type CelebrationRank = 'gold' | 'silver' | 'bronze';

/** Mascot art keys, matching the `Mascot` component's variant vocabulary. */
export type CelebrationMascot = 'celebration' | 'trophy' | 'encouraging';

export type ConfettiLevel = 'victory' | 'rank' | 'none';

export interface CelebrationPlan {
  /** 1–3. Never 0: see the note above about punishment screens. */
  stars: 1 | 2 | 3;
  rank: CelebrationRank;
  mascot: CelebrationMascot;
  /** Key into SOUND_EFFECTS — the one-shot that plays as the card lands. */
  sound: SoundEffectKey;
  confetti: ConfettiLevel;
  /** Translation key for the big line across the top of the card. */
  headlineKey: string;
  /** Whole-number percentage, already clamped to 0–100. */
  percent: number;
  /** Every answer correct, and there was at least one answer. */
  perfect: boolean;
}

const THREE_STAR_PERCENT = 90;
const TWO_STAR_PERCENT = 60;

const RANK_BY_STARS: Record<1 | 2 | 3, CelebrationRank> = {
  3: 'gold',
  2: 'silver',
  1: 'bronze',
};

const MASCOT_BY_RANK: Record<CelebrationRank, CelebrationMascot> = {
  gold: 'celebration',
  silver: 'trophy',
  bronze: 'encouraging',
};

const SOUND_BY_RANK: Record<CelebrationRank, SoundEffectKey> = {
  gold: 'epicVictory',
  silver: 'victoryFanfare',
  bronze: 'questComplete',
};

const CONFETTI_BY_RANK: Record<CelebrationRank, ConfettiLevel> = {
  gold: 'victory',
  silver: 'rank',
  bronze: 'none',
};

/**
 * Score a finished round.
 *
 * `total` of 0 is legitimate — a student can leave a board round without
 * answering anything — and resolves to a bronze, 0%, one-star card rather than
 * a NaN.
 */
export function practiceCelebrationPlan(correct: number, total: number): CelebrationPlan {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeCorrect = Math.min(Math.max(0, Math.floor(correct)), safeTotal || Math.max(0, Math.floor(correct)));
  const percent = safeTotal === 0 ? 0 : Math.round((Math.min(safeCorrect, safeTotal) / safeTotal) * 100);

  const stars: 1 | 2 | 3 =
    percent >= THREE_STAR_PERCENT ? 3 : percent >= TWO_STAR_PERCENT ? 2 : 1;
  const rank = RANK_BY_STARS[stars];
  const perfect = safeTotal > 0 && percent === 100;

  return {
    stars,
    rank,
    mascot: MASCOT_BY_RANK[rank],
    sound: SOUND_BY_RANK[rank],
    confetti: CONFETTI_BY_RANK[rank],
    headlineKey: perfect
      ? 'student.practiceFun.headline.perfect'
      : `student.practiceFun.headline.${rank}`,
    percent,
    perfect,
  };
}

/** Mascot flame art, smallest fire first. Files live in `public/mascot/`. */
export const STREAK_FLAME_ART = [
  '/mascot/streak-spark-nobg.webp',
  '/mascot/streak-kindling-nobg.webp',
  '/mascot/streak-molten-nobg.webp',
  '/mascot/streak-inferno-nobg.webp',
] as const;

/** The streak value at which each stage (1-indexed) first lights up. */
const FLAME_THRESHOLDS = [2, 4, 7, 12] as const;

export interface StreakFlame {
  /** 0 = no flame yet, 1–4 = how big the fire is. */
  stage: 0 | 1 | 2 | 3 | 4;
  /** Path to the mascot art for this stage, or null below the first rung. */
  art: string | null;
  /** True only on the exact streak that first reaches this stage. */
  milestone: boolean;
}

export function streakFlameStage(streak: number): StreakFlame {
  const safe = Math.max(0, Math.floor(streak));
  let stage = 0;
  for (let i = 0; i < FLAME_THRESHOLDS.length; i += 1) {
    if (safe >= FLAME_THRESHOLDS[i]) stage = i + 1;
  }
  return {
    stage: stage as StreakFlame['stage'],
    art: stage === 0 ? null : STREAK_FLAME_ART[stage - 1],
    milestone: (FLAME_THRESHOLDS as readonly number[]).includes(safe),
  };
}

const MIN_COINS = 3;
const MAX_COINS = 12;

/**
 * How many coins fly from the score card into the XP bar.
 *
 * The count is cosmetic — the XP total is authoritative — so it is bounded on
 * both ends: enough to read as a payout, few enough that a phone does not have
 * to animate a swarm.
 */
export function coinBurstCount(xpEarned: number): number {
  if (!Number.isFinite(xpEarned) || xpEarned <= 0) return 0;
  return Math.min(MAX_COINS, Math.max(MIN_COINS, Math.ceil(xpEarned / 10)));
}

/**
 * Length of the optional "beat the clock" round, in seconds.
 *
 * Solo Board is a fixed 90s — the board does not get harder with more
 * vocabulary, so the clock should not move either. Flashcard scales with the
 * deck (6s a card) because a 40-card deck in 45 seconds is not a challenge,
 * it is a joke.
 */
export function beatTheClockSeconds(mode: 'solo_board' | 'flashcard', wordCount: number): number {
  if (mode === 'solo_board') return 90;
  const scaled = Math.round(Math.max(0, wordCount) * 6);
  return Math.min(180, Math.max(45, scaled));
}

/**
 * XP a student earns per correct answer / found word in each practice mode.
 *
 * The picker shows this so the tiles are not interchangeable: "spelling pays
 * double a blitz word" is a real reason to pick one tile over another, and it
 * is the single most load-bearing number Blooket's own mode cards omit.
 *
 * SOURCE OF TRUTH is the server's `EDUCATION_XP_CONFIG` in
 * `backend/modules/educationXpManager.ts`. It is mirrored rather than imported
 * because that module is server-only and pulling it into a client component
 * would drag the whole XP manager into the browser bundle. The mirror is
 * pinned by a unit test — if the server rates change and this table does not,
 * the test fails rather than the picker quietly lying to students.
 *
 * `word_list` is 0 on purpose: it is a read-only preview of the lesson, not a
 * drill, and awards nothing.
 */
export const PRACTICE_XP_RATE: Record<string, number> = {
  flashcard: 10,
  solo_board: 15,
  word_tower: 15,
  warmup: 15,
  matching: 15,
  spelling: 20,
  blitz: 10,
  word_list: 0,
};

const VOCAB_FOCUS_XP_RATE = 15;

/** Per-answer XP for a picker tile id (`blitz`, `vocab_focus:synonym`, …). */
export function practiceXpRate(tileId: string): number {
  if (tileId.startsWith('vocab_focus')) return VOCAB_FOCUS_XP_RATE;
  return PRACTICE_XP_RATE[tileId] ?? VOCAB_FOCUS_XP_RATE;
}
