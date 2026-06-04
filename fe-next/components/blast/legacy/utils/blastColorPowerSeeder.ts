/**
 * blastColorPowerSeeder — Pure function to stamp color tags on tiles for color_power objectives.
 *
 * Strategy: After tile generation, post-process the board to tag a fixed % of regular tiles.
 * - Skips special tiles (bomb/gold/rainbow/lightning/prism etc) to preserve their identity
 * - Skips obstacle tiles (ice/frozen/frost) so they remain clearly special
 * - Uses deterministic seed for reproducibility
 * - New tiles spawned after cascade do NOT inherit color (one-shot advantage)
 */

import type { BlastTileState } from '@/shared/types/blast';
import type { ColorTag } from '../types';

/** List of special tile types that should never be colored */
const SPECIAL_TILES = new Set([
  'bomb',
  'gold',
  'rainbow',
  'lightning',
  'magnet',
  'prism',
  'gem',
  'diamond',
  'countdown',
  'portal',
  'catalyst',
  'shuffle',
  'magma',
  'crystal',
  'fuse',
  'anchor',
]);

/** List of obstacle tiles that should never be colored */
const OBSTACLE_TILES = new Set([
  'ice',
  'frozen',
  'frost',
]);

/**
 * Stamp color tags on a board grid at specified density.
 * Only colors 'standard' tiles, skips specials + obstacles.
 *
 * @param grid 2D array of tile states
 * @param color Color to apply (pink/cyan/lime)
 * @param density Fraction of eligible tiles to color (0-1)
 * @param seed Deterministic RNG seed for reproducibility
 * @returns New grid with color tags applied (does not mutate input)
 */
export function seedColorTags(
  grid: BlastTileState[][],
  color: ColorTag,
  density: number,
  seed: number,
): BlastTileState[][] {
  if (grid.length === 0) return [];

  // Deep copy to avoid mutation
  const newGrid = grid.map(row => row.map(tile => ({ ...tile })));

  // Collect all eligible tiles (standard type, not special or obstacle)
  const eligible: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < newGrid.length; r++) {
    for (let c = 0; c < newGrid[r].length; c++) {
      const tile = newGrid[r][c];
      if (
        tile.type === 'standard' &&
        !SPECIAL_TILES.has(tile.type) &&
        !OBSTACLE_TILES.has(tile.type)
      ) {
        eligible.push({ row: r, col: c });
      }
    }
  }

  if (eligible.length === 0) return newGrid;

  // Deterministic shuffle using seed-based RNG (simple linear congruential)
  const count = Math.floor(eligible.length * Math.max(0, Math.min(1, density)));
  const rng = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };

  // Fisher-Yates shuffle on first `count` elements
  for (let i = 0; i < count; i++) {
    const j = i + rng(eligible.length - i);
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // Apply color to first `count` shuffled tiles
  for (let i = 0; i < count; i++) {
    const { row, col } = eligible[i];
    newGrid[row][col].colorTag = color;
  }

  return newGrid;
}
