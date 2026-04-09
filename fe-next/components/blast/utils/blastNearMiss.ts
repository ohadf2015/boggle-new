import type { BlastTileState, BlastTileType } from '../types';

// ==================== Types ====================

export interface NearMissResult {
  /** Cells with near-miss shimmer opportunity (max 3) */
  cells: Array<{ row: number; col: number }>;
  /** Nature of the near-miss */
  type: 'combo' | 'cascade';
}

// ==================== Constants ====================

/** Special tile types eligible for near-miss detection (exclude standard, gold, diamond, ice) */
const COMBO_ELIGIBLE_TYPES: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'bomb', 'lightning', 'prism', 'rainbow', 'magnet', 'gem', 'frozen',
]);

/** Maximum cells to return to avoid visual clutter */
const MAX_NEAR_MISS_CELLS = 3;

// ==================== Detection ====================

/**
 * Detect a "near-miss" opportunity: special tiles adjacent to the submitted path
 * that could have formed a combo if included.
 *
 * Pure function — no side effects.
 *
 * @param submittedPath - Cells included in the accepted word
 * @param grid - Current letter grid (cleared cells may be empty strings)
 * @param tileStates - Per-cell tile state
 * @param gridSize - Grid dimensions (square)
 * @param hadCombo - If true, player already triggered a combo; skip detection
 */
export function detectNearMiss(
  submittedPath: Array<{ row: number; col: number }>,
  grid: string[][],
  tileStates: BlastTileState[][],
  gridSize: number,
  hadCombo: boolean = false,
): NearMissResult | null {
  // Skip if player already got a combo — no need to taunt them
  if (hadCombo) return null;

  if (submittedPath.length === 0) return null;

  // Build a Set of path cell keys for fast exclusion
  const pathKeys = new Set(submittedPath.map(c => `${c.row},${c.col}`));

  // Collect all uncleared, eligible special tiles adjacent to the path (not in path)
  const adjacentSpecials: Array<{ row: number; col: number }> = [];

  for (const pathCell of submittedPath) {
    // Scan 1-cell radius (8 directions)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;

        const nr = pathCell.row + dr;
        const nc = pathCell.col + dc;

        // Bounds check
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;

        const key = `${nr},${nc}`;
        // Skip cells already in the path
        if (pathKeys.has(key)) continue;

        const tile = tileStates[nr]?.[nc];
        if (!tile || tile.isCleared) continue;
        if (!COMBO_ELIGIBLE_TYPES.has(tile.type)) continue;

        // Avoid duplicates (a cell can be adjacent to multiple path cells)
        if (!adjacentSpecials.some(s => s.row === nr && s.col === nc)) {
          adjacentSpecials.push({ row: nr, col: nc });
        }
      }
    }
  }

  // Need at least 2 eligible specials to form a potential pair
  if (adjacentSpecials.length < 2) return null;

  // Return up to MAX_NEAR_MISS_CELLS of the adjacent specials
  return {
    cells: adjacentSpecials.slice(0, MAX_NEAR_MISS_CELLS),
    type: 'combo',
  };
}
