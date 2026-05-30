import type { ConnectionPuzzle, PuzzleLocale } from '../types';
import { EN_EASY } from './en-easy';
import { EN_MEDIUM } from './en-medium';
import { EN_HARD } from './en-hard';
import { HE_EASY } from './he-easy';
import { HE_MEDIUM } from './he-medium';
import { HE_HARD } from './he-hard';
import { HE_GENERATED } from './generated/he-hard.generated';
import { HE_ONLINE } from './he-online';

const PUZZLES_BY_LOCALE: Record<PuzzleLocale, ConnectionPuzzle[]> = {
  en: [...EN_EASY, ...EN_MEDIUM, ...EN_HARD],
  he: [...HE_EASY, ...HE_MEDIUM, ...HE_HARD, ...HE_GENERATED, ...HE_ONLINE],
};

/**
 * Bucket puzzles by bridge, always pull from the largest non-empty bucket
 * whose bridge differs from the previous pick. Within bridges, prefer items
 * whose word1 AND word2 also differ from the previous puzzle — players
 * complained about "many similar riddles in a row" even when bridges varied
 * (e.g. כוס+חלב followed by כוס+קפה: different bridges, identical word1).
 *
 * Pick algorithm for the next item:
 *  1. Find candidate buckets where bridge !== lastBridge.
 *  2. From the largest candidates, pick an item whose word1 / word2 also
 *     differ from the previous puzzle. Same-stem items are deferred via
 *     bucket reordering.
 *  3. Fall back to forced bridge repeat only when one bridge dominates the
 *     remaining pool.
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
  let lastWord1: string | null = null;
  let lastWord2: string | null = null;

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

    // Within the chosen bridge bucket, prefer the first item whose word1 +
    // word2 don't match the previous pick. Falls through to arr[0] if no
    // non-conflicting item exists in this bucket.
    let idx = 0;
    if (lastWord1 || lastWord2) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].word1 !== lastWord1 && arr[i].word2 !== lastWord2) {
          idx = i;
          break;
        }
      }
    }
    const picked = arr.splice(idx, 1)[0];
    out.push(picked);
    lastBridge = pickKey;
    lastWord1 = picked.word1;
    lastWord2 = picked.word2;
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

function activeOrdered(locale: PuzzleLocale, banned?: ReadonlySet<string>): ConnectionPuzzle[] {
  const ordered = ORDERED_BY_LOCALE[locale];
  if (!banned || banned.size === 0) return ordered;
  return ordered.filter((p) => !banned.has(p.id));
}

export function getTotalLevels(locale: string, banned?: ReadonlySet<string>): number {
  return activeOrdered(resolveLocale(locale), banned).length;
}

/**
 * Returns the puzzle for a given level number (1-based). Cycles through the
 * ordered pool when level exceeds total — keeps the game playable at high levels.
 *
 * `banned` is the auto-ban set from `v_connections_banned_puzzles` (≥3 distinct
 * authenticated players flagged dislike+gave_up). Filtered out before
 * indexing so level numbers always map to a *playable* puzzle.
 */
export function getPuzzleForLevel(
  locale: string,
  level: number,
  banned?: ReadonlySet<string>,
): ConnectionPuzzle | null {
  const ordered = activeOrdered(resolveLocale(locale), banned);
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
