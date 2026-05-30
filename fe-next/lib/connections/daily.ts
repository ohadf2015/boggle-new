/**
 * Word Bridge daily challenge — deterministic puzzle selection (pure).
 *
 * The day's set is a pure function of (UTC date, locale) ONLY. It deliberately
 * does NOT consult the live banned-puzzle list: every player on the same day
 * must get a byte-identical set, or the leaderboard would compare different
 * games and the competitive integrity is lost.
 */
import { getPuzzlesForLocale } from './puzzles';
import { POINTS_EASY, POINTS_MEDIUM, POINTS_HARD, STREAK_BONUS_MULTIPLIER } from './gameLogic';
import type { ConnectionPuzzle } from './types';

/** Number of puzzles in a daily challenge. */
export const DAILY_PUZZLE_COUNT = 5;

const POINTS_BY_DIFFICULTY: Record<ConnectionPuzzle['difficulty'], number> = {
  easy: POINTS_EASY,
  medium: POINTS_MEDIUM,
  hard: POINTS_HARD,
};

/** Deterministic 32-bit hash of a string (FNV-1a). */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, seedable PRNG → [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates over a copy of indices. */
function seededPick<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, Math.min(count, items.length)).map((i) => items[i]);
}

/** The deterministic puzzle set for a given UTC date + locale. */
export function dailyPuzzleSet(dateISO: string, locale: string): ConnectionPuzzle[] {
  const pool = getPuzzlesForLocale(locale);
  const rng = mulberry32(hashSeed(`${dateISO}:${locale}`));
  return seededPick(pool, DAILY_PUZZLE_COUNT, rng);
}

/**
 * Upper bound on a legitimate daily score — used to reject cheated submissions.
 * Every puzzle could be solved on a bonus streak, so ceil(base * multiplier)
 * per puzzle gives generous headroom above the true max without admitting
 * absurd values.
 */
export function maxDailyScore(dateISO: string, locale: string): number {
  return dailyPuzzleSet(dateISO, locale).reduce(
    (sum, p) => sum + Math.ceil(POINTS_BY_DIFFICULTY[p.difficulty] * STREAK_BONUS_MULTIPLIER),
    0,
  );
}
