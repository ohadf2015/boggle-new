/**
 * Word Wheel scoring rules — the one module both the client and the submit route score with.
 */

import { hashString, mulberry32 } from './prng';

const LENGTH_POINTS = [0, 0, 0, 12, 30, 60, 96, 144, 210];

export function scoreForLength(len: number): number {
  if (len <= 2) return 0;
  return LENGTH_POINTS[len] ?? 300;
}

export function scoreWord(word: string): number {
  return scoreForLength(word.length);
}

// Combo and gold letter start here so players of one day's board are always scored alike.
export const WHEEL_BONUS_START_DATE = '2026-10-31';

export function hasWheelBonuses(puzzleDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(puzzleDate) && puzzleDate >= WHEEL_BONUS_START_DATE;
}

export const COMBO_WINDOW_MS = 7000;
export const COMBO_STEP = 0.25;
export const MAX_COMBO_MULTIPLIER = 2;

/** `chain` = how many words in a row landed inside the combo window (the first word is 1). */
export function comboMultiplier(chain: number): number {
  if (chain <= 1) return 1;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + COMBO_STEP * (chain - 1));
}

export const GOLD_BONUS_MULTIPLIER = 1.5;
export const GOLD_COINS_PER_WORD = 2;
export const GOLD_COINS_DAILY_CAP = 20;
const GOLD_DAY_ODDS = 4 / 7;

interface GoldPuzzle { puzzleDate: string; language: string; outerLetters: string[] }

/** The day's gold letter (always an outer letter), or null on a plain day. */
export function goldLetterFor(puzzle: GoldPuzzle): string | null {
  if (!hasWheelBonuses(puzzle.puzzleDate) || puzzle.outerLetters.length === 0) return null;
  const random = mulberry32(hashString(`word-wheel-gold-${puzzle.puzzleDate}-${puzzle.language}`));
  if (random() >= GOLD_DAY_ODDS) return null;
  return puzzle.outerLetters[Math.floor(random() * puzzle.outerLetters.length)];
}

export function usesGold(word: string, gold: string | null): boolean {
  return !!gold && word.toUpperCase().includes(gold.toUpperCase());
}

function goldFactor(word: string, gold: string | null): number {
  return usesGold(word, gold) ? GOLD_BONUS_MULTIPLIER : 1;
}

export function wordPoints(word: string, { gold, multiplier }: { gold: string | null; multiplier: number }): number {
  return Math.round(scoreWord(word) * goldFactor(word, gold) * multiplier);
}

export interface WheelBreakdown { base: number; combo: number; gold: number; total: number; goldWords: number }

export function wheelBreakdown(words: ReadonlyArray<{ word: string; multiplier: number }>, gold: string | null): WheelBreakdown {
  const out: WheelBreakdown = { base: 0, combo: 0, gold: 0, total: 0, goldWords: 0 };
  for (const { word, multiplier } of words) {
    const base = scoreWord(word);
    const withGold = Math.round(base * goldFactor(word, gold));
    const final = wordPoints(word, { gold, multiplier });
    out.base += base;
    out.gold += withGold - base;
    out.combo += final - withGold;
    out.total += final;
    if (usesGold(word, gold)) out.goldWords += 1;
  }
  return out;
}

/** Highest score these words can legitimately reach; the server cannot see combo timing, so it allows the full combo. */
export function maxWheelScore(words: readonly string[], gold: string | null, puzzleDate: string): number {
  const bonuses = hasWheelBonuses(puzzleDate);
  return words.reduce((sum, w) => sum + (bonuses
    ? wordPoints(w, { gold, multiplier: MAX_COMBO_MULTIPLIER })
    : scoreWord(w)), 0);
}

export function goldCoinsFor(words: readonly string[], gold: string | null): number {
  if (!gold) return 0;
  const count = words.filter(w => usesGold(w, gold)).length;
  return Math.min(GOLD_COINS_DAILY_CAP, count * GOLD_COINS_PER_WORD);
}

// Average bonus a decent run earns from combo + gold; ranks scale with it so the ladder keeps its meaning.
export const WHEEL_BONUS_RANK_SCALE = 1.35;

export function scaleRankThresholds(thresholds: readonly number[], puzzleDate: string): number[] {
  if (!hasWheelBonuses(puzzleDate)) return [...thresholds];
  return thresholds.map((v, i) => (i <= 1 ? v : Math.round((v * WHEEL_BONUS_RANK_SCALE) / 6) * 6));
}
