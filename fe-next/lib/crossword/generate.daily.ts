// Daily + freeplay puzzle sourcing. This is the seam between the pure runtime generator
// (generate.runtime.ts) and the app: it lazy-loads the (large) clue bank only when generation is
// actually needed, derives deterministic seeds, and falls back to the baked static pool if a
// generation ever fails (vanishingly rare for en).
//
// Endless: the daily is generated deterministically from the calendar date (same for every player
// that day, forever — not a 73-puzzle cycle), and freeplay generates a fresh puzzle per seed.

import { generatePuzzle, type ClueMap } from './generate.runtime';
import { fnv1aHash } from '@/lib/rng/seededRandom';
import { getDailyPuzzle as getStaticDaily, getPool } from './puzzles';
import type { CrosswordPuzzle, Difficulty, PuzzleLocale } from './types';

/**
 * Newspaper-style weekday escalation (NYT-Mini convention): easy at the start of the week, hardest
 * on the weekend. Gives the daily a meaningful, predictable difficulty arc — and a reason to come
 * back — instead of a flat or arbitrary label. Deterministic from the UTC date.
 */
export function dailyDifficulty(dateISO: string): Difficulty {
  const [y, m, d] = dateISO.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  if (day === 1 || day === 2) return 'easy'; // Mon, Tue
  if (day === 0 || day === 6) return 'hard'; // Sat, Sun
  return 'medium'; // Wed, Thu, Fri
}

/**
 * Locale → clue-bank to fill from. he → Hebrew, es → Spanish (accent-folded keys), sv → Swedish,
 * everything else → en. es fills only because its keys are accent-folded (Spanish crosswords omit
 * grid diacritics; see answer.foldEsAccents). sv keeps å/ä/ö (distinct Swedish letters) and fills
 * with a dense-enough 3-letter pool. All three use the 4×4 mini (their banks are too thin for a
 * doubly-checked 5×5). See the spec.
 */
type GenLocale = 'en' | 'he' | 'es' | 'sv';
function genLocaleFor(locale: PuzzleLocale): GenLocale {
  if (locale === 'he') return 'he';
  if (locale === 'es') return 'es';
  if (locale === 'sv') return 'sv';
  return 'en';
}

// The clue bank is large (~200KB en). Load it once, on demand — it never touches the bundle until
// the first puzzle is generated.
const clueCache = new Map<GenLocale, ClueMap>();
async function loadClues(gen: GenLocale): Promise<ClueMap> {
  const cached = clueCache.get(gen);
  if (cached) return cached;
  const mod = await (gen === 'he'
    ? import('./data/clueBank.he.json')
    : gen === 'es'
      ? import('./data/clueBank.es.json')
      : gen === 'sv'
        ? import('./data/clueBank.sv.json')
        : import('./data/clueBank.en.json'));
  const clues = ((mod as { default?: unknown }).default ?? mod) as unknown as ClueMap;
  clueCache.set(gen, clues);
  return clues;
}

/** Deterministic per-(date, locale) seed — same calendar day → same daily puzzle for everyone. */
export function dailySeed(dateISO: string, locale: PuzzleLocale): number {
  return fnv1aHash(`cw-daily:${dateISO}:${locale}`);
}

/** Pick from the baked pool by seed — the offline-safe fallback when generation can't produce one. */
function pickFromPool(seed: number, locale: PuzzleLocale): CrosswordPuzzle | null {
  const pool = getPool(locale);
  if (pool.length === 0) return null;
  return pool[fnv1aHash(`cw-free:${seed}`) % pool.length] ?? null;
}

/**
 * The daily puzzle for a (UTC date, locale). Deterministic and endless: generated fresh from the
 * date seed, identical for every device that day. Falls back to the baked daily pick on failure.
 */
export async function generateDailyPuzzle(
  dateISO: string,
  locale: PuzzleLocale,
): Promise<CrosswordPuzzle | null> {
  let clues: ClueMap;
  try {
    clues = await loadClues(genLocaleFor(locale));
  } catch {
    return getStaticDaily(dateISO, locale);
  }
  const puzzle = generatePuzzle({
    seed: dailySeed(dateISO, locale),
    locale,
    clues,
    difficulty: dailyDifficulty(dateISO),
    id: `${locale}-daily-${dateISO}`,
  });
  return puzzle ?? getStaticDaily(dateISO, locale);
}

/**
 * A freeplay puzzle for an arbitrary seed — the endless "next puzzle" engine. Optionally targets a
 * difficulty (biases how many rarer words are allowed in). Falls back to a baked pool pick.
 */
export async function generateFreeplayPuzzle(
  seed: number,
  locale: PuzzleLocale,
  difficulty?: Difficulty,
): Promise<CrosswordPuzzle | null> {
  let clues: ClueMap;
  try {
    clues = await loadClues(genLocaleFor(locale));
  } catch {
    return pickFromPool(seed, locale);
  }
  const puzzle = generatePuzzle({
    seed,
    locale,
    clues,
    difficulty,
    id: `${locale}-free-${seed}`,
  });
  return puzzle ?? pickFromPool(seed, locale);
}
