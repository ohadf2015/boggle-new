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
 * Greedy round-robin: bucket puzzles by bridge, always pull from the largest
 * non-empty bucket whose bridge differs from the previous pick. This spreads
 * each "category" (bridge word) across the run instead of letting same-bridge
 * puzzles cluster (e.g., five בית puzzles in a row from id-sorted ordering).
 *
 * Only forced to repeat a bridge when one bucket has more items than every
 * other bucket combined — at that point alternation is mathematically impossible.
 */
function interleaveByBridge(items: ConnectionPuzzle[]): ConnectionPuzzle[] {
  const buckets = new Map<string, ConnectionPuzzle[]>();
  for (const p of items) {
    const arr = buckets.get(p.bridge);
    if (arr) arr.push(p);
    else buckets.set(p.bridge, [p]);
  }
  for (const arr of buckets.values()) arr.sort((a, b) => a.id.localeCompare(b.id));

  const out: ConnectionPuzzle[] = [];
  let lastBridge: string | null = null;
  while (out.length < items.length) {
    let pickKey: string | null = null;
    let pickSize = -1;
    for (const [key, arr] of buckets) {
      if (arr.length === 0) continue;
      if (key === lastBridge) continue;
      if (arr.length > pickSize) {
        pickSize = arr.length;
        pickKey = key;
      }
    }
    if (!pickKey) {
      for (const [key, arr] of buckets) {
        if (arr.length > 0) { pickKey = key; break; }
      }
    }
    const arr = buckets.get(pickKey!)!;
    out.push(arr.shift()!);
    lastBridge = pickKey;
  }
  return out;
}

/**
 * Difficulty-ramped order: easy → medium → hard. Within each difficulty, bridges
 * are interleaved so the same category does not appear back-to-back. Built once
 * at module load — pools are import-time constants.
 */
const ORDERED_BY_LOCALE: Record<PuzzleLocale, ConnectionPuzzle[]> = (() => {
  const out = {} as Record<PuzzleLocale, ConnectionPuzzle[]>;
  for (const locale of Object.keys(PUZZLES_BY_LOCALE) as PuzzleLocale[]) {
    const all = PUZZLES_BY_LOCALE[locale];
    out[locale] = [
      ...interleaveByBridge(all.filter((p) => p.difficulty === 'easy')),
      ...interleaveByBridge(all.filter((p) => p.difficulty === 'medium')),
      ...interleaveByBridge(all.filter((p) => p.difficulty === 'hard')),
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
