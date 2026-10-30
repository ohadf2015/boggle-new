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
import { inferTheme } from './theme';
import { dailyConnectionsVariant } from './dailyVariant';
import { getPyramidsForLocale } from './pyramid/puzzles';
import { FINALE_POINTS } from './pyramid/gameLogic';
import type { ConnectionPuzzle } from './types';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

/** Number of puzzles in a daily challenge. */
export const DAILY_PUZZLE_COUNT = 5;

/**
 * Wrong guesses allowed per bridge before the answer is revealed and play moves
 * on. Budgeted per puzzle, NOT as one shared pool: a shared pool of 3 meant a
 * player could end the whole run — and land on a "0 solved" screen — before
 * even seeing bridges 3-5.
 */
export const DAILY_ATTEMPTS_PER_PUZZLE = 4;

const POINTS_BY_DIFFICULTY: Record<ConnectionPuzzle['difficulty'], number> = {
  easy: POINTS_EASY,
  medium: POINTS_MEDIUM,
  hard: POINTS_HARD,
};

const DIFFICULTY_ORDER: Record<ConnectionPuzzle['difficulty'], number> = { easy: 0, medium: 1, hard: 2 };

/** Seeded Fisher-Yates shuffle over a copy of the array (deterministic). */
function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Greedily fill `count` puzzles from a deterministic shuffled candidate order,
 * maximizing felt variety: never two puzzles sharing a bridge, then no repeated
 * coarse theme, then no repeated word stems. Constraints relax in stages so the
 * count is always reached, but bridge-uniqueness is dropped last. Pure of the
 * inputs — same (shuffled order) → same set — so leaderboard integrity holds.
 *
 * Variety is enforced across the WHOLE set (not just adjacent pairs), and we
 * deliberately do NOT consult prior days: a daily must be reproducible from
 * (date, locale) alone, never from rolling history.
 */
function pickWithVariety(order: readonly ConnectionPuzzle[], count: number): ConnectionPuzzle[] {
  const selected: ConnectionPuzzle[] = [];
  const taken = new Set<string>();
  const usedBridges = new Set<string>();
  const usedThemes = new Set<string>();
  const usedWord1 = new Set<string>();
  const usedWord2 = new Set<string>();

  type Stage = 'strict' | 'noStem' | 'noTheme' | 'anyBridge';
  const accept = (p: ConnectionPuzzle, stage: Stage): boolean => {
    if (taken.has(p.id)) return false;
    if (stage !== 'anyBridge' && usedBridges.has(p.bridge)) return false;
    const theme = inferTheme(p);
    if ((stage === 'strict' || stage === 'noStem') && theme !== 'misc' && usedThemes.has(theme)) {
      return false;
    }
    if (stage === 'strict' && (usedWord1.has(p.word1) || usedWord2.has(p.word2))) return false;
    selected.push(p);
    taken.add(p.id);
    usedBridges.add(p.bridge);
    if (theme !== 'misc') usedThemes.add(theme);
    usedWord1.add(p.word1);
    usedWord2.add(p.word2);
    return true;
  };

  for (const stage of ['strict', 'noStem', 'noTheme', 'anyBridge'] as Stage[]) {
    if (selected.length >= count) break;
    for (const p of order) {
      if (selected.length >= count) break;
      accept(p, stage);
    }
  }
  return selected.slice(0, count);
}

/** The deterministic puzzle set for a given UTC date + locale. */
export function dailyPuzzleSet(dateISO: string, locale: string): ConnectionPuzzle[] {
  const pool = getPuzzlesForLocale(locale);
  const rng = mulberry32(fnv1aHash(`${dateISO}:${locale}`));
  const order = seededShuffle(pool, rng);
  const picked = pickWithVariety(order, DAILY_PUZZLE_COUNT);
  // Stable sort: the run builds from a warm-up to a finale, ties keep the seeded order.
  return picked.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
}

const DAILY_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/** True when this (date, locale) runs the pyramid instead of the 5-riddle chain. */
export function isPyramidDaily(dateISO: string, locale: string): boolean {
  return dailyConnectionsVariant(dateISO) === 'pyramid' && getPyramidsForLocale(locale).length > 0;
}

/** Locales whose rows on this date are pyramid runs — kept off the chain's board. */
export function pyramidLocalesOn(dateISO: string): string[] {
  return DAILY_LOCALES.filter((l) => isPyramidDaily(dateISO, l));
}

function ceilingOf(puzzles: readonly ConnectionPuzzle[]): number {
  return puzzles.reduce((sum, p) => sum + Math.ceil(POINTS_BY_DIFFICULTY[p.difficulty] * STREAK_BONUS_MULTIPLIER), 0);
}

/**
 * Upper bound on a legitimate daily score — used to reject cheated submissions.
 * Every puzzle could be solved on a bonus streak, so ceil(base * multiplier)
 * per puzzle gives generous headroom above the true max without admitting
 * absurd values. `playedIds` covers a run that started before a pool update
 * reseeded the day's set; they only ever raise the ceiling to a real 5-puzzle set.
 */
export function maxDailyScore(dateISO: string, locale: string, playedIds?: readonly string[]): number {
  if (isPyramidDaily(dateISO, locale)) return 3 * POINTS_HARD + FINALE_POINTS;
  const base = ceilingOf(dailyPuzzleSet(dateISO, locale));
  if (!playedIds || new Set(playedIds).size !== DAILY_PUZZLE_COUNT || playedIds.length !== DAILY_PUZZLE_COUNT) return base;
  const played = puzzlesByIds(playedIds, locale);
  return played ? Math.max(base, ceilingOf(played)) : base;
}

/**
 * Look up stored puzzle ids in the live pool. A same-day revisit uses this so
 * pool growth (which reseeds `dailyPuzzleSet`) can't swap the answer key under
 * a finished run; null means an id is gone and the caller should recompute.
 */
export function puzzlesByIds(ids: readonly string[], locale: string): ConnectionPuzzle[] | null {
  const byId = new Map(getPuzzlesForLocale(locale).map((p) => [p.id, p]));
  const out = ids.map((id) => byId.get(id));
  return out.every((p): p is ConnectionPuzzle => !!p) ? out : null;
}
