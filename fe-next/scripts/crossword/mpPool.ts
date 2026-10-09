/**
 * Exhaustive grid enumeration + distinct-set selection for the build-time multiplayer pools.
 * The runtime filler returns one fill per seed, so a small word pool yields only a few distinct
 * grids; here every fill is collected so the selection step has the full candidate set.
 */

import { buildGrid } from '../../lib/crossword/grid';
import { isRealCrossword } from '../../lib/crossword/templates';
import { mulberry32 } from '../../lib/rng/seededRandom';

export interface Template {
  size: number;
  blocks: ReadonlyArray<readonly [number, number]>;
}

type Grid = (string | null)[][];
interface Slot { cells: [number, number][]; }

const MIN_RUN = 3;
const NODE_BUDGET = 2_000_000;

function slotsOf(t: Template): Slot[] {
  const black = new Set(t.blocks.map(([r, c]) => `${r},${c}`));
  const isWhite = (r: number, c: number) => r >= 0 && c >= 0 && r < t.size && c < t.size && !black.has(`${r},${c}`);
  const slots: Slot[] = [];
  for (let r = 0; r < t.size; r++) {
    let run: [number, number][] = [];
    for (let c = 0; c <= t.size; c++) {
      if (c < t.size && isWhite(r, c)) run.push([r, c]);
      else { if (run.length >= MIN_RUN) slots.push({ cells: run }); run = []; }
    }
  }
  for (let c = 0; c < t.size; c++) {
    let run: [number, number][] = [];
    for (let r = 0; r <= t.size; r++) {
      if (r < t.size && isWhite(r, c)) run.push([r, c]);
      else { if (run.length >= MIN_RUN) slots.push({ cells: run }); run = []; }
    }
  }
  return slots;
}

/**
 * Every grid the template admits from the given words (each word used at most once, every
 * result a real crossword), up to maxGrids. Depth-first over slots, longest first.
 */
export function enumerateFills(t: Template, words: readonly string[], maxGrids: number): Grid[] {
  const slots = slotsOf(t).sort((a, b) => b.cells.length - a.cells.length);
  const byLen = new Map<number, string[]>();
  for (const w of words) {
    const list = byLen.get(w.length) ?? [];
    list.push(w);
    byLen.set(w.length, list);
  }
  const letters: (string | null)[][] = Array.from({ length: t.size }, (_, r) =>
    Array.from({ length: t.size }, (_, c) => (t.blocks.some(([br, bc]) => br === r && bc === c) ? null : '')),
  );
  const used = new Set<string>();
  const out: Grid[] = [];
  let nodes = 0;

  const assemble = (): Grid => letters.map((row) => row.map((ch) => (ch === '' ? null : ch)));

  const filled = new Set<number>();
  // Most-constrained slot next, so crossings prune before same-direction slots multiply out.
  const nextSlot = (): number => {
    let best = -1;
    let bestKnown = -1;
    for (let i = 0; i < slots.length; i++) {
      if (filled.has(i)) continue;
      const known = slots[i].cells.filter(([r, c]) => letters[r][c] !== '').length;
      if (known > bestKnown) { best = i; bestKnown = known; }
    }
    return best;
  };

  const place = (depth: number): void => {
    if (out.length >= maxGrids || nodes++ > NODE_BUDGET) return;
    if (depth === slots.length) {
      const grid = assemble();
      if (isRealCrossword(grid, false)) out.push(grid);
      return;
    }
    const idx = nextSlot();
    const { cells } = slots[idx];
    filled.add(idx);
    for (const w of byLen.get(cells.length) ?? []) {
      if (used.has(w)) continue;
      let fits = true;
      for (let k = 0; k < cells.length && fits; k++) {
        const [r, c] = cells[k];
        const cur = letters[r][c];
        if (cur !== '' && cur !== w[k]) fits = false;
      }
      if (!fits) continue;
      const written: [number, number][] = [];
      for (let k = 0; k < cells.length; k++) {
        const [r, c] = cells[k];
        if (letters[r][c] === '') { letters[r][c] = w[k]; written.push([r, c]); }
      }
      used.add(w);
      place(depth + 1);
      used.delete(w);
      for (const [r, c] of written) letters[r][c] = '';
      if (out.length >= maxGrids) break;
    }
    filled.delete(idx);
  };

  place(0);
  return out;
}

export interface Candidate {
  answers: ReadonlySet<string>;
  score: number;
}

function conflicts(a: Candidate, b: Candidate, maxShared: number): boolean {
  let shared = 0;
  for (const w of a.answers) if (b.answers.has(w) && ++shared > maxShared) return true;
  return false;
}

/**
 * Largest set of candidates no two of which share more than maxShared answers. Greedy by score
 * over many seeded shuffles; the best run wins. Deterministic for a given seed.
 */
export function selectDistinct<T extends Candidate>(cands: readonly T[], maxShared: number, seed: number, tries = 300): T[] {
  const byScore = [...cands].sort((a, b) => b.score - a.score);
  let best: T[] = [];
  for (let attempt = 0; attempt < tries; attempt++) {
    const order = attempt === 0 ? byScore : shuffled(byScore, mulberry32(seed * 7919 + attempt));
    const chosen: T[] = [];
    for (const c of order) {
      if (chosen.every((p) => !conflicts(p, c, maxShared))) chosen.push(c);
    }
    if (chosen.length > best.length) best = chosen;
  }
  return best;
}

function shuffled<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface PoolCandidate extends Candidate {
  grid: Grid;
  clues: Record<string, string>;
}

/**
 * Turns fills into candidates. A grid is dropped when any answer has no clue or is denylisted, so
 * every surviving slot is clued by the bank entry it was filled from. score = summed commonness.
 */
export function toCandidates(
  grids: readonly Grid[],
  clueOf: (answer: string) => string | undefined,
  denylist: ReadonlySet<string>,
  scoreOf: (answer: string) => number,
): PoolCandidate[] {
  const out: PoolCandidate[] = [];
  for (const grid of grids) {
    const { slots } = buildGrid({ rtl: false, solution: grid });
    const clues: Record<string, string> = {};
    let ok = true;
    for (const s of slots) {
      const clue = clueOf(s.answer);
      if (!clue || denylist.has(s.answer)) { ok = false; break; }
      clues[s.id] = clue;
    }
    if (!ok) continue;
    const answers = new Set(slots.map((s) => s.answer));
    const score = [...answers].reduce((sum, w) => sum + scoreOf(w), 0);
    out.push({ grid, answers, clues, score });
  }
  return out;
}

/**
 * Every 180°-symmetric block pattern of a size×size grid whose white runs (every row and column)
 * are all between MIN_RUN and maxRun letters, with at least one run in each row and column.
 */
export function symmetricPatterns(size: number, maxRun: number): Template[] {
  const n = size * size;
  const reps: number[] = [];
  for (let i = 0; i <= Math.floor((n - 1) / 2); i++) reps.push(i);
  const out: Template[] = [];
  for (let mask = 1; mask < 1 << reps.length; mask++) {
    const blocks: [number, number][] = [];
    for (let k = 0; k < reps.length; k++) {
      if (!(mask & (1 << k))) continue;
      const i = reps[k];
      blocks.push([Math.floor(i / size), i % size]);
      const m = n - 1 - i;
      if (m !== i) blocks.push([Math.floor(m / size), m % size]);
    }
    const t: Template = { size, blocks };
    if (validPattern(t, maxRun)) out.push(t);
  }
  return out;
}

function validPattern(t: Template, maxRun: number): boolean {
  const black = new Set(t.blocks.map(([r, c]) => `${r},${c}`));
  const lines = (fixed: (i: number, k: number) => [number, number]) => {
    for (let i = 0; i < t.size; i++) {
      let run = 0;
      let runs = 0;
      for (let k = 0; k <= t.size; k++) {
        const white = k < t.size && !black.has(fixed(i, k).join(','));
        if (white) { run++; continue; }
        if (run > 0) {
          if (run < MIN_RUN || run > maxRun) return false;
          runs++;
        }
        run = 0;
      }
      if (runs === 0) return false;
    }
    return true;
  };
  return lines((i, k) => [i, k]) && lines((i, k) => [k, i]);
}
