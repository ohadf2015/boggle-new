import type { PRNG } from '../prng';
import type { CellId } from '../types';

export type GridCells = Partial<Record<CellId, string>>;
export type Grid = { cols: number; rows: number; cells: GridCells };
export type Placement = {
  word: string;
  axis: 'H' | 'V';
  cells: { col: number; row: number }[];
};
export type PlaceWordsResult =
  | { ok: true; placements: Placement[]; grid: Grid; heights: number[] }
  | { ok: false; reason: string };

const cellId = (col: number, row: number): CellId => `c${col}r${row}` as CellId;

function tryPlaceWord(
  word: string, grid: Grid, axis: 'H' | 'V',
  startCol: number, startRow: number, reversed: boolean,
): { ok: true; cells: { col: number; row: number }[]; nextGrid: Grid } | { ok: false } {
  const letters = reversed ? word.split('').reverse() : word.split('');
  const proposed: { col: number; row: number; letter: string }[] = [];
  for (let i = 0; i < letters.length; i++) {
    const col = axis === 'H' ? startCol + i : startCol;
    const row = axis === 'V' ? startRow + i : startRow;
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return { ok: false };
    const existing = grid.cells[cellId(col, row)];
    if (existing && existing !== letters[i]) return { ok: false };
    proposed.push({ col, row, letter: letters[i]! });
  }
  const next: Grid = { ...grid, cells: { ...grid.cells } };
  for (const p of proposed) next.cells[cellId(p.col, p.row)] = p.letter;
  return { ok: true, cells: proposed.map((p) => ({ col: p.col, row: p.row })), nextGrid: next };
}

function countOverlap(grid: Grid, cells: { col: number; row: number }[], word: string, reversed: boolean): number {
  const letters = reversed ? word.split('').reverse() : word.split('');
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    const id = cellId(cells[i]!.col, cells[i]!.row);
    if (grid.cells[id] === letters[i]) n++;
  }
  return n;
}

export type PlaceWordsOptions = {
  cols: number;
  maxHeight: number;
  // L1–L3 foundation rule: pin the longest word horizontally on row 0 so the
  // board reads as a clear starter row.
  firstWordRowZero?: boolean;
  // L6+ variety rule: guarantee at least one word lands vertically.
  requireVerticalWord?: boolean;
};

export function placeWords(
  words: string[], opts: PlaceWordsOptions, prng: PRNG,
): PlaceWordsResult {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  let grid: Grid = { cols: opts.cols, rows: opts.maxHeight, cells: {} };
  const placements: Placement[] = [];
  let needVertical = opts.requireVerticalWord === true;
  for (let wIdx = 0; wIdx < sorted.length; wIdx++) {
    const word = sorted[wIdx]!;
    const candidates: { axis: 'H' | 'V'; col: number; row: number; reversed: boolean; overlap: number }[] = [];
    for (const axis of ['H', 'V'] as const) {
      const maxStartCol = axis === 'H' ? opts.cols - word.length : opts.cols - 1;
      const maxStartRow = axis === 'V' ? opts.maxHeight - word.length : opts.maxHeight - 1;
      for (let c = 0; c <= maxStartCol; c++) {
        for (let r = 0; r <= maxStartRow; r++) {
          for (const reversed of [false, true]) {
            const try1 = tryPlaceWord(word, grid, axis, c, r, reversed);
            if (try1.ok) {
              const overlap = countOverlap(grid, try1.cells, word, reversed);
              candidates.push({ axis, col: c, row: r, reversed, overlap });
            }
          }
        }
      }
    }
    if (candidates.length === 0) return { ok: false, reason: `cannot place ${word}` };

    // Foundation: first word horizontal on row 0.
    let workingCandidates = candidates;
    if (wIdx === 0 && opts.firstWordRowZero) {
      const filtered = candidates.filter((c) => c.axis === 'H' && c.row === 0);
      if (filtered.length === 0) return { ok: false, reason: 'first word cannot anchor row 0' };
      workingCandidates = filtered;
    }

    // Variety: force vertical on the last word if no V has been placed yet
    // and the constraint is still active. Holding the constraint until the
    // final word lets earlier placements stay flexible while still guaranteeing
    // a V eventually lands.
    const isLast = wIdx === sorted.length - 1;
    if (needVertical && isLast) {
      const vOnly = workingCandidates.filter((c) => c.axis === 'V');
      if (vOnly.length === 0) return { ok: false, reason: 'cannot satisfy requireVerticalWord' };
      workingCandidates = vOnly;
    }

    const hasOverlap = workingCandidates.filter((c) => c.overlap > 0);
    const pool = placements.length === 0 || hasOverlap.length === 0 ? workingCandidates : hasOverlap;
    const chosen = pool[prng.intRange(pool.length)]!;
    const placed = tryPlaceWord(word, grid, chosen.axis, chosen.col, chosen.row, chosen.reversed);
    if (!placed.ok) return { ok: false, reason: 'internal placement race' };
    grid = placed.nextGrid;
    placements.push({ word, axis: chosen.axis, cells: placed.cells });
    if (chosen.axis === 'V') needVertical = false;
  }
  const heights = new Array(opts.cols).fill(0);
  for (const id of Object.keys(grid.cells) as CellId[]) {
    const m = id.match(/^c(\d+)r(\d+)$/);
    if (!m) continue;
    const col = +m[1]!, row = +m[2]!;
    heights[col] = Math.max(heights[col]!, row + 1);
  }
  return { ok: true, placements, grid, heights };
}

export type ForwardSimResult = { ok: true; order: string[] } | { ok: false; reason: string };

export function forwardSim(grid: Grid, words: string[]): ForwardSimResult {
  if (words.length > 7) return { ok: false, reason: 'too many words for sim' };
  for (const order of permutations(words)) {
    let g = { ...grid, cells: { ...grid.cells } };
    let allOk = true;
    for (const w of order) {
      const found = findWordInGrid(g, w);
      if (!found) { allOk = false; break; }
      g = popCells(g, found);
    }
    if (allOk) return { ok: true, order };
  }
  return { ok: false, reason: 'no valid pop order' };
}

function findWordInGrid(grid: Grid, word: string): { col: number; row: number }[] | null {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const cells: { col: number; row: number }[] = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cc = c + dc*i, cr = r + dr*i;
          if (cc < 0 || cc >= grid.cols || cr < 0 || cr >= grid.rows) { ok = false; break; }
          if (grid.cells[cellId(cc, cr)] !== word[i]) { ok = false; break; }
          cells.push({ col: cc, row: cr });
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

function popCells(grid: Grid, cells: { col: number; row: number }[]): Grid {
  const removed = new Set(cells.map((c) => cellId(c.col, c.row)));
  const newCells: GridCells = {};
  for (let col = 0; col < grid.cols; col++) {
    const stack: string[] = [];
    for (let row = 0; row < grid.rows; row++) {
      const id = cellId(col, row);
      const v = grid.cells[id];
      if (v && !removed.has(id)) stack.push(v);
    }
    for (let row = 0; row < stack.length; row++) newCells[cellId(col, row)] = stack[row]!;
  }
  return { ...grid, cells: newCells };
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i]!, ...p]);
  }
  return out;
}
