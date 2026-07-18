/**
 * Pure path-tracing rules for the drag-to-trace board (mouse + touch).
 *
 * A trace is an ordered list of [row,col] cells. A cell may be appended iff it
 * is 8-adjacent to the current last cell and not already used — EXCEPT that
 * moving back onto the second-to-last cell "backtracks" (pops the last cell),
 * which is what a finger sliding back over the previous tile should do.
 */

export type Cell = [number, number];

export function sameCell(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
}

export function pathIncludes(path: Cell[], cell: Cell): boolean {
  return path.some((c) => sameCell(c, cell));
}

/**
 * Given the current path and the cell the pointer just entered, return the next
 * path. Rules:
 *  - empty path → start it with the cell.
 *  - re-enter the same last cell → unchanged (no-op).
 *  - enter the second-to-last cell → backtrack (drop last).
 *  - enter an unused 8-adjacent cell → append.
 *  - anything else (non-adjacent, or already-used non-backtrack) → unchanged.
 */
export function extendPath(path: Cell[], cell: Cell): Cell[] {
  if (path.length === 0) return [cell];
  const last = path[path.length - 1];
  if (sameCell(last, cell)) return path;
  if (path.length >= 2 && sameCell(path[path.length - 2], cell)) {
    return path.slice(0, -1); // backtrack
  }
  if (pathIncludes(path, cell)) return path; // used, not a backtrack
  if (!isAdjacent(last, cell)) return path; // not reachable
  return [...path, cell];
}

export function pathToWord(board: string[][], path: Cell[]): string {
  return path.map(([r, c]) => board[r][c]).join('');
}
