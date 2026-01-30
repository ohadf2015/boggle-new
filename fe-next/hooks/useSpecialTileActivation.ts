/**
 * useSpecialTileActivation Hook - Special Tile Mechanics
 *
 * Handles activation logic for frozen, locked, and multiplier tiles.
 *
 * FROZEN TILES (ice type with isFrozen=true):
 * - Thaw when adjacent tile is used in a valid word
 * - Set activationEffect='melt' when thawing
 * - Skip gravity during cascade (stay in place)
 *
 * LOCKED TILES (type='locked'):
 * - Unlock when word contains same letter
 * - Set activationEffect='unlock' when unlocking
 * - Block spawning in their position until unlocked
 *
 * MULTIPLIER TILES (type='multiplier'):
 * - Apply 2x to word score when used
 * - Stack with other multipliers and gold tiles
 * - Set activationEffect='multiply' when activated
 * - Single use: becomes standard after activation
 */

import { useState, useCallback } from 'react';
import type { TileState } from '@/types/adventure';

// ==============================================
// PURE FUNCTIONS (EXPORTED)
// ==============================================

/**
 * Get indices of all tiles adjacent to a given tile (8-way adjacency)
 *
 * @param tileIndex - Flat grid index (row * gridSize + col)
 * @param gridSize - Grid dimension
 * @returns Array of adjacent tile indices
 */
export function getAdjacentIndices(tileIndex: number, gridSize: number): number[] {
  const row = Math.floor(tileIndex / gridSize);
  const col = tileIndex % gridSize;
  const adjacent: number[] = [];

  // Check all 8 directions
  const directions = [
    [-1, -1], [-1, 0], [-1, 1], // Top row
    [0, -1],           [0, 1],  // Same row
    [1, -1],  [1, 0],  [1, 1],  // Bottom row
  ];

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;

    // Check bounds
    if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
      const adjacentIndex = newRow * gridSize + newCol;
      adjacent.push(adjacentIndex);
    }
  }

  return adjacent;
}

/**
 * Check if a frozen tile should thaw
 *
 * Frozen tiles thaw when an adjacent tile is used in a word
 *
 * @param frozenTile - The frozen tile to check
 * @param adjacentIndices - Indices of tiles adjacent to this tile
 * @param wordTileIndices - Indices of tiles used in the word
 * @returns True if tile should thaw
 */
export function checkFrozenThaw(
  frozenTile: TileState,
  adjacentIndices: number[],
  wordTileIndices: number[]
): boolean {
  // Only frozen tiles can thaw
  if (!frozenTile.isFrozen) {
    return false;
  }

  // Check if any adjacent tile is in the word
  for (const adjacentIdx of adjacentIndices) {
    if (wordTileIndices.includes(adjacentIdx)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a locked tile should unlock
 *
 * Locked tiles unlock when a word contains the same letter
 *
 * @param lockedTile - The locked tile to check
 * @param gridTiles - Full grid state
 * @param wordTileIndices - Indices of tiles used in the word
 * @returns True if tile should unlock
 */
export function checkLockedUnlock(
  lockedTile: TileState,
  gridTiles: TileState[][],
  wordTileIndices: number[]
): boolean {
  if (lockedTile.type !== 'locked') {
    return false;
  }

  const gridSize = gridTiles.length;
  const lockedLetter = lockedTile.letter.toUpperCase();

  // Check each tile in the word
  for (const flatIndex of wordTileIndices) {
    const row = Math.floor(flatIndex / gridSize);
    const col = flatIndex % gridSize;
    const wordTile = gridTiles[row]?.[col];

    if (wordTile && wordTile.letter.toUpperCase() === lockedLetter) {
      return true;
    }
  }

  return false;
}

/**
 * Apply multiplier bonus from multiplier tiles
 *
 * Each multiplier tile in the word multiplies the score by 2x
 * Multiple multipliers stack (2 multipliers = 4x)
 *
 * @param wordScore - Base score for the word
 * @param wordTiles - Array of tiles in the word
 * @returns Final score with multiplier and whether multiplier was used
 */
export function applyMultiplier(
  wordScore: number,
  wordTiles: TileState[]
): { finalScore: number; multiplierUsed: boolean } {
  let multiplier = 1;

  // Count multiplier tiles
  for (const tile of wordTiles) {
    if (tile.type === 'multiplier') {
      multiplier *= 2;
    }
  }

  return {
    finalScore: wordScore * multiplier,
    multiplierUsed: multiplier > 1,
  };
}

// ==============================================
// HOOK
// ==============================================

/**
 * Result of processing a word submission with special tiles
 */
export interface ProcessWordResult {
  /** Updated grid with activation effects set */
  updatedGrid: TileState[][];
  /** Set of tile indices that activated this turn */
  activatedTiles: Set<number>;
  /** Final score after multipliers */
  finalScore: number;
  /** Total multiplier bonus applied */
  multiplierBonus: number;
}

/**
 * Hook for managing special tile activation logic
 *
 * @returns Functions and state for special tile processing
 */
export function useSpecialTileActivation() {
  const [activatedTiles, setActivatedTiles] = useState<Set<number>>(new Set());
  const [multiplierBonus, setMultiplierBonus] = useState(1);

  /**
   * Process a word submission and activate special tiles
   *
   * @param gridTiles - Current grid state
   * @param wordTileIndices - Flat indices of tiles in the word
   * @param baseScore - Base score before multipliers
   * @returns Result with updated grid and activations
   */
  const processWordSubmission = useCallback(
    (
      gridTiles: TileState[][],
      wordTileIndices: number[],
      baseScore: number
    ): ProcessWordResult => {
      const gridSize = gridTiles.length;
      const activated = new Set<number>();

      // Deep clone grid to avoid mutation
      const updatedGrid = gridTiles.map(row => row.map(tile => ({ ...tile })));

      // Get word tiles for multiplier calculation
      const wordTiles: TileState[] = [];
      for (const flatIndex of wordTileIndices) {
        const row = Math.floor(flatIndex / gridSize);
        const col = flatIndex % gridSize;
        const tile = updatedGrid[row]?.[col];
        if (tile) {
          wordTiles.push(tile);
        }
      }

      // 1. Check frozen tiles for thawing
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const flatIndex = row * gridSize + col;
          const tile = updatedGrid[row][col];

          if (tile.isFrozen) {
            const adjacentIndices = getAdjacentIndices(flatIndex, gridSize);
            const shouldThaw = checkFrozenThaw(tile, adjacentIndices, wordTileIndices);

            if (shouldThaw) {
              updatedGrid[row][col].isFrozen = false;
              updatedGrid[row][col].activationEffect = 'melt';
              updatedGrid[row][col].activationTimestamp = Date.now();
              activated.add(flatIndex);
            }
          }
        }
      }

      // 2. Check locked tiles for unlocking
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const flatIndex = row * gridSize + col;
          const tile = updatedGrid[row][col];

          if (tile.type === 'locked') {
            const shouldUnlock = checkLockedUnlock(tile, updatedGrid, wordTileIndices);

            if (shouldUnlock) {
              updatedGrid[row][col].type = 'standard';
              updatedGrid[row][col].activationEffect = 'unlock';
              updatedGrid[row][col].activationTimestamp = Date.now();
              activated.add(flatIndex);
            }
          }
        }
      }

      // 3. Apply multiplier bonus
      const multiplierResult = applyMultiplier(baseScore, wordTiles);

      // 4. Mark multiplier tiles as activated
      for (const flatIndex of wordTileIndices) {
        const row = Math.floor(flatIndex / gridSize);
        const col = flatIndex % gridSize;
        const tile = updatedGrid[row]?.[col];

        if (tile && tile.type === 'multiplier') {
          updatedGrid[row][col].activationEffect = 'multiply';
          updatedGrid[row][col].activationTimestamp = Date.now();
          activated.add(flatIndex);
        }
      }

      // Update state
      setActivatedTiles(activated);
      setMultiplierBonus(multiplierResult.multiplierUsed ? multiplierResult.finalScore / baseScore : 1);

      return {
        updatedGrid,
        activatedTiles: activated,
        finalScore: multiplierResult.finalScore,
        multiplierBonus: multiplierResult.multiplierUsed ? multiplierResult.finalScore / baseScore : 1,
      };
    },
    []
  );

  return {
    processWordSubmission,
    activatedTiles,
    multiplierBonus,
  };
}
