/**
 * blastObjectiveGuarantee — Ensures the board has enough tiles of each type
 * required by wave objectives. Called after initial board generation.
 *
 * Replaces random standard tiles with the required special tile types.
 * Never replaces existing special tiles (beyond the minimum-ratio budget).
 */

import type { BlastTileState, BlastObjective, BlastTileType } from '../types';
import { getInitialHitsRemaining } from './blastTileUtils';

/**
 * Minimum fraction of tiles that must remain 'standard' after objective placement.
 * Prevents boards from being overwhelmed with special tiles when objectives demand many.
 */
export const MIN_STANDARD_RATIO = 0.6;

/**
 * Post-process a generated tile grid to guarantee that collect_type and
 * clear_all_type objectives are achievable.
 *
 * - collect_type: ensures at least `target` tiles of `tileType` exist
 * - clear_all_type: ensures at least 1 tile of `tileType` exists
 *
 * Fixes applied:
 * - BUGF-08: Fisher-Yates shuffle on standardPositions distributes objective
 *   tiles randomly across the board instead of clustering top-left.
 * - BUGF-09: Enforces MIN_STANDARD_RATIO (60%) so boards never become
 *   unplayable when objectives require many special tiles.
 *
 * Returns a new grid (does not mutate the input).
 */
export function guaranteeObjectiveTiles(
  grid: BlastTileState[][],
  objectives: BlastObjective[],
): BlastTileState[][] {
  // Deep copy to avoid mutation
  const result = grid.map(row => row.map(tile => ({ ...tile })));

  // Collect all tile-type requirements from objectives
  const requirements = new Map<BlastTileType, number>();

  for (const obj of objectives) {
    if (obj.type === 'collect_type' && obj.tileType) {
      const current = requirements.get(obj.tileType) || 0;
      requirements.set(obj.tileType, Math.max(current, obj.target));
    } else if (obj.type === 'clear_all_type' && obj.tileType) {
      // Need at least 1 tile so the objective is meaningful
      const current = requirements.get(obj.tileType) || 0;
      requirements.set(obj.tileType, Math.max(current, 1));
    }
  }

  if (requirements.size === 0) return result;

  // Count existing tiles of each required type
  const existingCounts = new Map<BlastTileType, number>();
  for (const row of result) {
    for (const tile of row) {
      if (requirements.has(tile.type)) {
        existingCounts.set(tile.type, (existingCounts.get(tile.type) || 0) + 1);
      }
    }
  }

  // Build list of standard tile positions (candidates for replacement)
  const standardPositions: Array<{ row: number; col: number }> = [];
  for (const row of result) {
    for (const tile of row) {
      if (tile.type === 'standard') {
        standardPositions.push({ row: tile.row, col: tile.col });
      }
    }
  }

  // BUGF-08 fix: Fisher-Yates shuffle so objective tiles are distributed
  // randomly across the board instead of clustering in top-left positions.
  for (let i = standardPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [standardPositions[i], standardPositions[j]] = [standardPositions[j], standardPositions[i]];
  }

  // BUGF-09 fix: Enforce minimum standard tile ratio.
  // Cap the total number of standard tiles we are allowed to convert to specials.
  const totalTiles = result.length * result[0].length;
  const minStandardCount = Math.ceil(totalTiles * MIN_STANDARD_RATIO);
  const currentStandardCount = standardPositions.length;
  // How many standard tiles we can convert before violating the ratio
  const conversionBudget = Math.max(0, currentStandardCount - minStandardCount);

  // For each required type, place missing tiles within the conversion budget
  let totalPlaced = 0;
  for (const [tileType, needed] of requirements) {
    const existing = existingCounts.get(tileType) || 0;
    const deficit = needed - existing;

    if (deficit <= 0) continue;

    // Respect conversion budget: don't place more than budget allows
    const remainingBudget = conversionBudget - totalPlaced;
    const toPlace = Math.min(deficit, standardPositions.length - totalPlaced, remainingBudget);

    for (let i = 0; i < toPlace; i++) {
      const pos = standardPositions[totalPlaced++];
      const tile = result[pos.row][pos.col];
      tile.type = tileType;
      tile.hitsRemaining = getInitialHitsRemaining(tileType);
    }
  }

  return result;
}
