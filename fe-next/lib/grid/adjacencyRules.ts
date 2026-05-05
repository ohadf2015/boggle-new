/**
 * Shared 8-neighbour grid adjacency check.
 *
 * Used by both real game's `useGridInteraction` and practice's
 * `usePracticeGridDragSelect`. Centralizing the rule here means the
 * "diagonals count as adjacent" decision lives in exactly one place;
 * any future change (e.g. king-only paths, knight-jumps) propagates to
 * both modes automatically.
 */
export interface GridPosition {
  row: number;
  col: number;
}

/**
 * Two cells are adjacent when their row and column distance are each
 * ≤ 1 AND they are not the same cell. Diagonals count.
 */
export function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  return (
    Math.abs(a.row - b.row) <= 1 &&
    Math.abs(a.col - b.col) <= 1 &&
    !(a.row === b.row && a.col === b.col)
  );
}
