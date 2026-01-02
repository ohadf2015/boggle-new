/**
 * Grid Utilities
 * Shared constants and functions for grid-based operations
 *
 * Consolidates duplicated code from:
 * - fe-next/workers/gridWorker.ts
 * - fe-next/utils/clientWordValidator.ts
 * - fe-next/utils/utils.ts
 * - fe-next/backend/utils/gameUtils.ts
 */

/**
 * 8-directional adjacency offsets for grid traversal
 * Used in word search algorithms (DFS, BFS)
 */
export const DIRECTIONS: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
] as const;

/**
 * Check if grid coordinates are within bounds
 */
export function isInBounds(row: number, col: number, rows: number, cols: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/**
 * Get all adjacent cells for a given position
 */
export function getAdjacentCells(
  row: number,
  col: number,
  rows: number,
  cols: number
): [number, number][] {
  return DIRECTIONS
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(([r, c]) => isInBounds(r, c, rows, cols));
}
