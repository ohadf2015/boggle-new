/**
 * blastLevelClear — auto-trigger sequence logic for level-clear celebration.
 *
 * When a level is cleared (objectives met or all tiles cleared), remaining
 * special tiles auto-fire sequentially — the "Sugar Crush" equivalent.
 *
 * Pure functions, no side effects. The sequence is consumed by BlastScene
 * to play the actual animations via the bridge.
 */

import type { BlastTileState, BlastTileType } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Stagger delay between each auto-triggered tile (ms). */
export const AUTO_TRIGGER_STAGGER_MS = 200;

/** Score awarded per remaining move converted at level clear. */
export const MOVE_CONVERSION_SCORE = 50;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutoTriggerStep {
  /** Tile type being auto-triggered. */
  type: BlastTileType;
  /** Grid row of the tile. */
  row: number;
  /** Grid col of the tile. */
  col: number;
  /** Delay from sequence start before this tile fires (ms). */
  delayMs: number;
}

// ─── Priority order for auto-trigger sequence ───────────────────────────────
// Bombs first (area damage), then lightning (column), then prism (cross),
// then the rest in decreasing visual impact order.

const TYPE_PRIORITY: BlastTileType[] = [
  'bomb',
  'lightning',
  'prism',
  'magnet',
  'gold',
  'gem',
  'frozen',
  'ice',
  'rainbow',
  'diamond',
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the ordered auto-trigger sequence from remaining (uncleared) special tiles.
 *
 * - Filters out cleared tiles and standard tiles
 * - Sorts by priority order (bombs first, etc.)
 * - Assigns staggered delays (200ms apart)
 */
export function buildAutoTriggerSequence(grid: BlastTileState[][]): AutoTriggerStep[] {
  const specials: Array<{ type: BlastTileType; row: number; col: number; priority: number }> = [];

  for (const row of grid) {
    for (const tile of row) {
      if (tile.isCleared) continue;
      if (tile.type === 'standard') continue;

      const priority = TYPE_PRIORITY.indexOf(tile.type);
      specials.push({
        type: tile.type,
        row: tile.row,
        col: tile.col,
        priority: priority >= 0 ? priority : TYPE_PRIORITY.length,
      });
    }
  }

  // Sort by priority (lower index = fires first)
  specials.sort((a, b) => a.priority - b.priority);

  return specials.map((tile, index) => ({
    type: tile.type,
    row: tile.row,
    col: tile.col,
    delayMs: index * AUTO_TRIGGER_STAGGER_MS,
  }));
}

/**
 * Calculate bonus score from converting remaining moves at level clear.
 * Each remaining move converts to MOVE_CONVERSION_SCORE points.
 */
export function calculateMoveConversionBonus(movesRemaining: number): number {
  if (movesRemaining <= 0) return 0;
  return movesRemaining * MOVE_CONVERSION_SCORE;
}

// Star rating: use calculateEarnedStars from blastStarCalculator.ts (canonical source)
