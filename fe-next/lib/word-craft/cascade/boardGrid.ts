import { draw, type TileBag } from '../tileBag';

export interface CascadeCell {
  id: string;
  letter: string | null;
  value: number;
}

export interface CascadeGrid {
  rows: number;
  cols: number;
  cells: CascadeCell[];
  index: Map<string, number>;
}

export function cellIdFor(row: number, col: number): string {
  return `s-${row}-${col}`;
}

export interface NeighborOpts {
  diagonal?: boolean;
}

const ORTHO: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAG: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function idx(rows: number, cols: number, row: number, col: number): number {
  return row * cols + col;
}

export function createGrid(rows: number, cols: number, bag: TileBag): CascadeGrid {
  const total = rows * cols;
  const tiles = draw(bag, total);
  if (tiles.length < total) {
    throw new Error(`createGrid: insufficient tiles in bag (got ${tiles.length}, need ${total})`);
  }
  const cells: CascadeCell[] = new Array(total);
  const index = new Map<string, number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const t = tiles[i];
      const id = cellIdFor(r, c);
      cells[i] = { id, letter: t.letter, value: t.value };
      index.set(id, i);
    }
  }
  return { rows, cols, cells, index };
}

/** Mutates cell letter+value at a slot. Used by burn/gravity/spawn. */
export function setCellLetter(
  grid: CascadeGrid,
  row: number,
  col: number,
  letter: string | null,
  value: number
): void {
  const i = row * grid.cols + col;
  const cell = grid.cells[i];
  grid.cells[i] = { id: cell.id, letter, value };
}

export function cellCount(grid: CascadeGrid): number {
  return grid.cells.length;
}

export function cellAt(grid: CascadeGrid, row: number, col: number): CascadeCell | null {
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) return null;
  return grid.cells[idx(grid.rows, grid.cols, row, col)];
}

export function coordsOf(grid: CascadeGrid, cellId: string): { row: number; col: number } | null {
  const i = grid.index.get(cellId);
  if (i === undefined) return null;
  return { row: Math.floor(i / grid.cols), col: i % grid.cols };
}

export function neighborsOf(
  grid: CascadeGrid,
  cellId: string,
  opts: NeighborOpts = {}
): CascadeCell[] {
  const c = coordsOf(grid, cellId);
  if (!c) return [];
  const deltas = opts.diagonal ? [...ORTHO, ...DIAG] : ORTHO;
  const out: CascadeCell[] = [];
  for (const [dr, dc] of deltas) {
    const n = cellAt(grid, c.row + dr, c.col + dc);
    if (n) out.push(n);
  }
  return out;
}
