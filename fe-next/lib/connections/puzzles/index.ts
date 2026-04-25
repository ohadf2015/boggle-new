import type { ConnectionPuzzle, PuzzleLocale } from '../types';
import { EN_EASY } from './en-easy';
import { EN_MEDIUM } from './en-medium';
import { EN_HARD } from './en-hard';
import { HE_EASY } from './he-easy';
import { HE_MEDIUM } from './he-medium';
import { HE_HARD } from './he-hard';
import { HE_GENERATED } from './generated/he-hard.generated';

const PUZZLES_BY_LOCALE: Record<PuzzleLocale, ConnectionPuzzle[]> = {
  en: [...EN_EASY, ...EN_MEDIUM, ...EN_HARD],
  he: [...HE_EASY, ...HE_MEDIUM, ...HE_HARD, ...HE_GENERATED],
};

/**
 * Stable, difficulty-ramped order: all easy → all medium → all hard.
 * Within each difficulty, sort by id so order is deterministic across sessions.
 * Built once per locale; safe because puzzle pools are import-time constants.
 */
const ORDERED_BY_LOCALE: Record<PuzzleLocale, ConnectionPuzzle[]> = (() => {
  const out = {} as Record<PuzzleLocale, ConnectionPuzzle[]>;
  for (const locale of Object.keys(PUZZLES_BY_LOCALE) as PuzzleLocale[]) {
    const all = PUZZLES_BY_LOCALE[locale];
    const sortById = (a: ConnectionPuzzle, b: ConnectionPuzzle) => a.id.localeCompare(b.id);
    out[locale] = [
      ...all.filter((p) => p.difficulty === 'easy').sort(sortById),
      ...all.filter((p) => p.difficulty === 'medium').sort(sortById),
      ...all.filter((p) => p.difficulty === 'hard').sort(sortById),
    ];
  }
  return out;
})();

function resolveLocale(locale: string): PuzzleLocale {
  return locale in PUZZLES_BY_LOCALE ? (locale as PuzzleLocale) : 'en';
}

export function getPuzzlesForLocale(locale: string): ConnectionPuzzle[] {
  return PUZZLES_BY_LOCALE[resolveLocale(locale)];
}

export function getTotalLevels(locale: string): number {
  return ORDERED_BY_LOCALE[resolveLocale(locale)].length;
}

/**
 * Returns the puzzle for a given level number (1-based). Cycles through the
 * ordered pool when level exceeds total — keeps the game playable at high levels.
 */
export function getPuzzleForLevel(locale: string, level: number): ConnectionPuzzle | null {
  const ordered = ORDERED_BY_LOCALE[resolveLocale(locale)];
  if (ordered.length === 0) return null;
  const lvl = Math.max(1, Math.floor(level));
  const idx = (lvl - 1) % ordered.length;
  return ordered[idx];
}

/** @deprecated kept for any legacy callers; new code should use getPuzzleForLevel */
export function getShuffledPuzzles(locale: string, count = 20): ConnectionPuzzle[] {
  const all = getPuzzlesForLocale(locale);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const easy = shuffled.filter((p) => p.difficulty === 'easy').slice(0, Math.floor(count * 0.4));
  const medium = shuffled.filter((p) => p.difficulty === 'medium').slice(0, Math.floor(count * 0.4));
  const hard = shuffled.filter((p) => p.difficulty === 'hard').slice(0, Math.floor(count * 0.2));
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}
