// Runtime crossword generation — pure, seedable, offline. Wraps the CSP filler
// (generate.core.ts) with the shared quality gate (templates.ts) and the bundled clue bank to
// produce a fully-built, fully-clued CrosswordPuzzle from a single integer seed.
//
// This is what makes the mode ENDLESS: instead of cycling a finite baked pool, the daily puzzle
// is generated deterministically from the date and freeplay generates a fresh puzzle per seed —
// all client-side, no network, no DB. Build-time baking (scripts/crossword/build*.ts) stays as a
// guaranteed fallback pool.

import { buildGrid } from './grid';
import { buildDictIndex, fillGrid } from './generate.core';
import { isRealCrossword, templatesFor, defaultSize } from './templates';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import type { CrosswordPuzzle, Difficulty, PuzzleLocale, Slot } from './types';

export interface ClueEntry {
  clue: string;
  score: number;
}

/** word -> clue entry. Shape of the bundled clueBank.{locale}.json. */
export type ClueMap = Record<string, ClueEntry>;

export interface GenerateOptions {
  /** Integer seed — same seed always yields the same puzzle. */
  seed: number;
  locale: PuzzleLocale;
  /** word -> { clue, score }. The clue bank. Every placed word must have an entry. */
  clues: ClueMap;
  /**
   * Words to FILL from (defaults to the clue-bank keys). For Hebrew the clue bank is sparse, so a
   * denser common-word pool is passed here and puzzles with any unclued word are rejected.
   */
  fillPool?: string[];
  /** Override grid size (defaults by locale: 5 for en, 4 for he). */
  size?: number;
  /** RTL across direction (defaults from locale). */
  rtl?: boolean;
  /** Difficulty target — biases how many rarer words are allowed in (see DIFFICULTY_PREFER). */
  difficulty?: Difficulty;
  /** Stable id for the produced puzzle. Defaults to `${locale}-gen-${seed}`. */
  id?: string;
  /** Deterministic retry budget across (template, sub-seed) combos. */
  maxRetries?: number;
  /**
   * Backtracking cap PER attempt. Kept low on purpose: a fill that hasn't solved in a few
   * thousand steps is on a bad path, and reseeding (next attempt) is far cheaper than grinding it
   * out. This bounds worst-case latency so generation can run inline behind a brief loader.
   */
  maxStepsPerAttempt?: number;
}

// How many of the most-common words the filler is allowed to prefer. A SMALLER prefer set =
// only the very commonest words land = easier; a larger set lets rarer "glue" words in = harder.
const DIFFICULTY_PREFER: Record<Difficulty, number> = {
  easy: 450,
  medium: 800,
  hard: 1600,
};

/**
 * Generate one fully-built, fully-clued puzzle, or null if no valid fill was found within the
 * retry budget (caller should fall back to the baked pool — should be vanishingly rare for en).
 */
export function generatePuzzle(opts: GenerateOptions): CrosswordPuzzle | null {
  const { seed, locale, clues } = opts;
  const rtl = opts.rtl ?? locale === 'he';
  const size = opts.size ?? defaultSize(locale);
  const templates = templatesFor(locale, size);
  if (templates.length === 0) return null;

  const maxLen = size; // longest run a size×size symmetric mini can have
  const fillPool = (opts.fillPool ?? Object.keys(clues)).filter(
    (w) => w.length >= 3 && w.length <= maxLen,
  );
  if (fillPool.length < 50) return null; // pool too thin to fill a doubly-checked grid

  const idx = buildDictIndex(fillPool);

  // Frequency bias: try the commonest words first so recognizable answers land; rarer pool words
  // act only as crossing glue. The prefer-set size is the difficulty lever.
  const preferN = DIFFICULTY_PREFER[opts.difficulty ?? 'medium'];
  const byScoreDesc = [...fillPool].sort(
    (a, b) => (clues[b]?.score ?? 0) - (clues[a]?.score ?? 0),
  );
  const prefer = new Set(byScoreDesc.slice(0, preferN));

  // Template pick is seeded so the whole generation is deterministic in `seed`.
  const pickRng = mulberry32(seed >>> 0);
  // Bounded worst case beats occasionally-fast: a fill that hasn't solved in ~5k cheap steps is
  // on a bad path, so cap low and reseed. Measured on the real EN bank: 40/40 success, ~350ms
  // median, <1s p90 — comfortably covered by a compositor-driven (jank-free) loader.
  const maxRetries = opts.maxRetries ?? 60;
  const maxSteps = opts.maxStepsPerAttempt ?? 5000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const tpl = templates[Math.floor(pickRng() * templates.length) % templates.length];
    const subSeed = fnv1aHash(`${seed}:${attempt}`);
    const grid = fillGrid(
      { size: tpl.size, rtl, blocks: tpl.blocks },
      idx,
      { rng: mulberry32(subSeed), maxSteps, prefer },
    );
    if (!grid || !isRealCrossword(grid, rtl)) continue;

    const { cells, slots } = buildGrid({ rtl, solution: grid });
    const cluedSlots: Slot[] = [];
    let unclued = false;
    for (const s of slots) {
      const entry = clues[s.answer];
      if (!entry?.clue) {
        unclued = true;
        break;
      }
      cluedSlots.push({ ...s, clue: entry.clue });
    }
    if (unclued) continue; // drop puzzles with any unclued word, try next combo

    // The label IS the requested difficulty (which also drove the prefer-set bias above), so it's
    // meaningful and matches what the player asked for. A doubly-checked 5×5 always needs some
    // rarer crossing glue, so an obscurity-derived label would read "hard" almost every time —
    // the difficulty lever lives in the prefer-set size, not a post-hoc word count.
    const difficulty: Difficulty = opts.difficulty ?? 'medium';

    return {
      id: opts.id ?? `${locale}-gen-${seed}`,
      locale,
      size: tpl.size,
      rtl,
      cells,
      slots: cluedSlots,
      difficulty,
      source: 'generated',
    };
  }

  return null;
}
