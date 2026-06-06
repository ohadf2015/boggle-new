// Constraint-satisfaction crossword filler. Given a block template + a dictionary, fill the
// grid so every across and down run is a valid word. Pure + seedable → build-time generation.
//
// Slot geometry (incl. the RTL right-to-left across logic) is reused from buildGrid by feeding
// it a placeholder mask, so the bug-prone direction math lives in exactly one place.

import { buildGrid } from './grid';
import type { GridLayout } from './types';

export interface DictIndex {
  /** word length -> list of words of that length (normalized). */
  byLength: Map<number, string[]>;
}

export function buildDictIndex(words: Iterable<string>): DictIndex {
  const byLength = new Map<number, string[]>();
  for (const w of words) {
    if (!w) continue;
    const len = w.length;
    let bucket = byLength.get(len);
    if (!bucket) {
      bucket = [];
      byLength.set(len, bucket);
    }
    bucket.push(w);
  }
  return { byLength };
}

export interface FillTemplate {
  size: number;
  rtl: boolean;
  /** Block (dark) cell coordinates as [row, col]. */
  blocks: ReadonlyArray<[number, number]>;
}

export interface FillOptions {
  rng?: () => number;
  /** Safety cap on backtracking placements before giving up. */
  maxSteps?: number;
}

interface SlotGeom {
  cells: ReadonlyArray<{ row: number; col: number }>;
  length: number;
}

const cellKey = (r: number, c: number) => `${r},${c}`;

/** Fisher-Yates shuffle (in place) using the provided rng. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fill the template. Returns a size×size matrix (letter | null for blocks), or null if no
 * solution is found within maxSteps.
 */
export function fillGrid(
  template: FillTemplate,
  dict: DictIndex,
  options: FillOptions = {},
): (string | null)[][] | null {
  const { size, rtl, blocks } = template;
  const rng = options.rng ?? Math.random;
  const maxSteps = options.maxSteps ?? 200_000;

  const blockSet = new Set(blocks.map(([r, c]) => cellKey(r, c)));
  // Membership set for validating slots completed purely by crossings (see solve()).
  const poolSet = new Set<string>();
  for (const [, words] of dict.byLength) for (const w of words) poolSet.add(w);

  // Placeholder layout: fillable cells get 'x', blocks get null. buildGrid gives us slot
  // geometry (cells + direction order) — we discard its placeholder answers.
  const placeholder: (string | null)[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (blockSet.has(cellKey(r, c)) ? null : 'x')),
  );
  const { slots: skeleton } = buildGrid({ rtl, solution: placeholder } as GridLayout);
  const slots: SlotGeom[] = skeleton.map((s) => ({ cells: s.cells, length: s.length }));

  // Current letters keyed by cell. Blocks never get a letter.
  const letters = new Map<string, string>();
  const used = new Set<string>(); // disallow repeating the same word in one grid
  let steps = 0;

  /** Pattern for a slot from currently-placed crossing letters: array with letter|null. */
  const patternOf = (slot: SlotGeom): (string | null)[] =>
    slot.cells.map((c) => letters.get(cellKey(c.row, c.col)) ?? null);

  const matches = (word: string, pattern: (string | null)[]): boolean => {
    for (let i = 0; i < pattern.length; i++) {
      const p = pattern[i];
      if (p !== null && p !== word[i]) return false;
    }
    return true;
  };

  const candidates = (slot: SlotGeom): string[] => {
    const pool = dict.byLength.get(slot.length) ?? [];
    const pattern = patternOf(slot);
    const out: string[] = [];
    for (const w of pool) {
      if (used.has(w)) continue;
      if (matches(w, pattern)) out.push(w);
    }
    return out;
  };

  const isFilled = (slot: SlotGeom): boolean =>
    slot.cells.every((c) => letters.has(cellKey(c.row, c.col)));

  const wordOf = (slot: SlotGeom): string =>
    slot.cells.map((c) => letters.get(cellKey(c.row, c.col)) ?? '').join('');

  // Recursive backtracking with most-constrained-slot-first selection.
  const solve = (): boolean => {
    if (steps++ > maxSteps) return false;

    // Pick the unfilled slot with the fewest candidates (fail-fast / MRV heuristic).
    let target: SlotGeom | null = null;
    let targetCands: string[] = [];
    let best = Infinity;
    for (const slot of slots) {
      if (isFilled(slot)) {
        // A slot completed purely by crossings must STILL be a real word — otherwise the
        // intersecting fills produced a non-word (e.g. "eie"). Reject and backtrack.
        if (!poolSet.has(wordOf(slot))) return false;
        continue;
      }
      const cands = candidates(slot);
      if (cands.length < best) {
        best = cands.length;
        target = slot;
        targetCands = cands;
        if (best === 0) break; // dead end — backtrack immediately
      }
    }

    if (!target) return true; // all slots filled (and all validated above)
    if (targetCands.length === 0) return false;

    shuffle(targetCands, rng);
    for (const word of targetCands) {
      // Place, remembering which cells we newly set so we can undo precisely.
      const placed: string[] = [];
      let ok = true;
      for (let i = 0; i < target.cells.length; i++) {
        const k = cellKey(target.cells[i].row, target.cells[i].col);
        const existing = letters.get(k);
        if (existing === undefined) {
          letters.set(k, word[i]);
          placed.push(k);
        } else if (existing !== word[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        used.add(word);
        if (solve()) return true;
        used.delete(word);
      }
      for (const k of placed) letters.delete(k);
    }
    return false;
  };

  if (!solve()) return null;

  // Materialize the solved matrix.
  const grid: (string | null)[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      blockSet.has(cellKey(r, c)) ? null : (letters.get(cellKey(r, c)) ?? null),
    ),
  );
  return grid;
}
