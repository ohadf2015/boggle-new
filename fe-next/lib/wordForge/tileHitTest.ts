/**
 * Pure hit-testing + path-stepping helpers for the Word Forge letter grid.
 *
 * Kept framework-free so the tricky bits — RTL column mirroring and
 * padding/gap-aware coordinate math — are unit-testable without a DOM.
 */

export interface TilePos {
  row: number;
  col: number;
}

export interface HitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TileHitOptions {
  /** Number of cells per side (grid is square). */
  gridSize: number;
  /** Uniform inner padding of the grid container, in px. */
  padding?: number;
  /** Gap between adjacent cells, in px. */
  gap?: number;
  /** True when the grid renders right-to-left (Hebrew). Mirrors columns. */
  rtl?: boolean;
}

/**
 * Map a viewport point (e.g. a touch position) to the *logical* grid cell.
 *
 * Two correctness traps this handles that the naive `width / gridSize` did not:
 *  1. `getBoundingClientRect` returns the border-box, so it includes the
 *     container padding and the inter-cell gaps. Ignoring them drifts the
 *     mapping by ~(2·padding + (n-1)·gap) across the row — enough to mis-hit
 *     the edge cells even in LTR.
 *  2. In RTL the CSS grid places DOM column 0 on the *right*, so a point's
 *     visual column (counted from the left) must be mirrored to the logical
 *     column the data array uses.
 *
 * Returns null when the point falls outside the inner (cell) area.
 */
export function tileFromPoint(
  clientX: number,
  clientY: number,
  rect: HitRect,
  { gridSize, padding = 0, gap = 0, rtl = false }: TileHitOptions,
): TilePos | null {
  if (gridSize <= 0) return null;

  const innerW = rect.width - padding * 2;
  const innerH = rect.height - padding * 2;
  if (innerW <= 0 || innerH <= 0) return null;

  const cellW = (innerW - gap * (gridSize - 1)) / gridSize;
  const cellH = (innerH - gap * (gridSize - 1)) / gridSize;

  const x = clientX - rect.left - padding;
  const y = clientY - rect.top - padding;
  // Reject taps in the padding band or fully outside the grid.
  if (x < 0 || y < 0 || x > innerW || y > innerH) return null;

  let col = Math.min(Math.floor(x / (cellW + gap)), gridSize - 1);
  const row = Math.min(Math.floor(y / (cellH + gap)), gridSize - 1);
  if (col < 0 || row < 0) return null;

  if (rtl) col = gridSize - 1 - col;
  return { row, col };
}

/**
 * Decide the next selection path given a candidate cell the pointer moved over.
 *
 * Rules (standard swipe-to-spell):
 *  - Same as the current head → no change (finger held still).
 *  - Candidate is the *second-to-last* cell → backtrack (pop the head). This is
 *    the drag-to-undo gesture players expect; without it a mis-swipe forces a
 *    full restart.
 *  - Candidate already used (and not the backtrack target) → ignored.
 *  - Candidate adjacent to the head → extend.
 *  - Otherwise → no change.
 */
export function stepPath(
  path: TilePos[],
  candidate: TilePos,
  isAdjacent: (a: TilePos, b: TilePos) => boolean,
): TilePos[] {
  if (path.length === 0) return [candidate];

  const last = path[path.length - 1];
  if (last.row === candidate.row && last.col === candidate.col) return path;

  // Backtrack onto the previous tile → drop the current head.
  if (path.length >= 2) {
    const prev = path[path.length - 2];
    if (prev.row === candidate.row && prev.col === candidate.col) {
      return path.slice(0, -1);
    }
  }

  if (path.some((p) => p.row === candidate.row && p.col === candidate.col)) return path;
  if (!isAdjacent(last, candidate)) return path;

  return [...path, candidate];
}
