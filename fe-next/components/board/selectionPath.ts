export interface CellRef {
  row: number;
  col: number;
  letter: string;
}

/** A tile as measured on screen: centre and edge length, in viewport px. */
export interface TileBox extends CellRef {
  cx: number;
  cy: number;
  size: number;
}

export interface BoardGeometry {
  tiles: TileBox[];
  byKey: Map<string, TileBox>;
  /** Median tile edge, used for stroke widths and sampling step. */
  cell: number;
}

export interface Point {
  x: number;
  y: number;
}

export type PathChange = 'add' | 'back' | 'none';

export interface StepOptions {
  canEnter: (cell: CellRef, pathLength: number) => boolean;
  adjacent: (a: CellRef, b: CellRef) => boolean;
}

/** Inner hit circle while dragging: wide enough to be forgiving, small enough that diagonals never clip a corner neighbour. */
export const DRAG_HIT_RADIUS = 0.46;
export const PRESS_HIT_RADIUS = 0.72;

export const keyOf = (row: number, col: number): string => `${row}-${col}`;

export function buildGeometry(tiles: TileBox[]): BoardGeometry {
  const byKey = new Map<string, TileBox>();
  for (const t of tiles) byKey.set(keyOf(t.row, t.col), t);
  const sizes = tiles.map((t) => t.size).sort((a, b) => a - b);
  return { tiles, byKey, cell: sizes[Math.floor(sizes.length / 2)] ?? 0 };
}

export function hitTest(geo: BoardGeometry, x: number, y: number, radius = DRAG_HIT_RADIUS): TileBox | null {
  let best: TileBox | null = null;
  let bestD = Infinity;
  for (const t of geo.tiles) {
    const d = Math.hypot(x - t.cx, y - t.cy);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  if (!best || bestD > best.size * radius) return null;
  return best;
}

export function stepPath(path: CellRef[], hit: CellRef, opts: StepOptions): { path: CellRef[]; change: PathChange } {
  const last = path[path.length - 1];
  if (!last || (last.row === hit.row && last.col === hit.col)) return { path, change: 'none' };
  const prev = path[path.length - 2];
  if (prev && prev.row === hit.row && prev.col === hit.col) return { path: path.slice(0, -1), change: 'back' };
  if (path.some((c) => c.row === hit.row && c.col === hit.col)) return { path, change: 'none' };
  if (!opts.adjacent(last, hit) || !opts.canEnter(hit, path.length)) return { path, change: 'none' };
  return { path: [...path, { row: hit.row, col: hit.col, letter: hit.letter }], change: 'add' };
}

/** Points along a segment so a fast swipe (or a coalesced frame) cannot skip a tile. */
export function samplesBetween(from: Point, to: Point, step: number): Point[] {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.max(1, Math.ceil(dist / Math.max(1, step)));
  const out: Point[] = [];
  for (let i = 1; i <= n; i++) {
    out.push({ x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n });
  }
  return out;
}

export function heatOf(length: number): number {
  if (length >= 7) return 3;
  if (length >= 5) return 2;
  if (length >= 3) return 1;
  return 0;
}

export const isNeighbour = (a: { row: number; col: number }, b: { row: number; col: number }): boolean =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
