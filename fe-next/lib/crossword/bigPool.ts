// The newspaper-size puzzle pool.
//
// Baked offline (scripts/crossword/build-big.ts) rather than generated in the browser: an 11×11
// fill takes seconds and fails about half its attempts, which inline would be a multi-second stall.
// The pool stores GRIDS ONLY — clues are joined on at load time from the same lazily-loaded clue
// bank the mini generator uses, so the payload stays small and clue-bank fixes reach old puzzles.

import { buildGrid } from './grid';
import { fnv1aHash } from '@/lib/rng/seededRandom';
import type { ClueMap } from './generate.runtime';
import type { CrosswordPuzzle, Difficulty, PuzzleLocale, Slot } from './types';

interface BakedPool {
  size: number;
  grids: string[][]; // one string per row, '#' marks a block
}

let poolCache: BakedPool | null = null;

async function loadPool(): Promise<BakedPool | null> {
  if (poolCache) return poolCache;
  try {
    const mod = await import('./data/grids.en11.json');
    poolCache = ((mod as { default?: unknown }).default ?? mod) as unknown as BakedPool;
    return poolCache;
  } catch {
    return null; // pool not baked yet
  }
}

/** How many puzzles the pool holds — 0 when it hasn't been baked. */
export async function bigPoolSize(): Promise<number> {
  return (await loadPool())?.grids.length ?? 0;
}

function toPuzzle(
  rows: string[],
  clues: ClueMap,
  meta: { id: string; locale: PuzzleLocale; difficulty: Difficulty },
): CrosswordPuzzle | null {
  const solution = rows.map((r) => r.split('').map((ch) => (ch === '#' ? null : ch)));
  const { size, cells, slots } = buildGrid({ rtl: false, solution });
  const clued: Slot[] = [];
  for (const s of slots) {
    const entry = clues[s.answer];
    if (!entry?.clue) return null; // a clue bank edit dropped a word this grid depends on
    clued.push({ ...s, clue: entry.clue });
  }
  return { ...meta, size, rtl: false, cells, slots: clued, source: 'generated' };
}

/**
 * Pick a puzzle from the pool by seed. Deterministic, so the same date yields the same board for
 * everyone — the property the daily streak depends on. Walks forward on a miss rather than
 * returning null, so one word going stale in the clue bank can't take a whole day's puzzle down.
 */
export async function pickBigPuzzle(
  seed: number,
  clues: ClueMap,
  meta: { id: string; locale: PuzzleLocale; difficulty: Difficulty },
): Promise<CrosswordPuzzle | null> {
  const pool = await loadPool();
  if (!pool?.grids.length) return null;
  const start = fnv1aHash(`cw-big:${seed}`) % pool.grids.length;
  for (let i = 0; i < pool.grids.length; i++) {
    const puzzle = toPuzzle(pool.grids[(start + i) % pool.grids.length], clues, meta);
    if (puzzle) return puzzle;
  }
  return null;
}
