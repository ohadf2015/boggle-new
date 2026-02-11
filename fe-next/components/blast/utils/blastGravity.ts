import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from '../types';
import { generateBlastLetter, rollSpecialType } from './blastLetterGenerator';

/** Tile with computed fall distance for animation */
export interface FallingTile {
  row: number;
  col: number;
  letter: string;
  type: BlastTileType;
  fallDistance: number; // rows to fall
}

/** New tile to appear from the top */
export interface NewTile {
  row: number;
  col: number;
  letter: string;
  type: BlastTileType;
  /** How many rows above the grid it starts (for entrance animation) */
  spawnOffset: number;
}

/** Tile that was cleared (for clearing animation) */
export interface ClearedTile {
  row: number;
  col: number;
  letter: string;
  type: BlastTileType;
}

export interface GravityResult {
  /** Updated letter grid after gravity + refill */
  newGrid: LetterGrid;
  /** Updated tile states after gravity + refill */
  newTileStates: BlastTileState[][];
  /** Tiles that were cleared (for clearing animation) */
  clearedTiles: ClearedTile[];
  /** Tiles that need to animate falling down */
  fallingTiles: FallingTile[];
  /** New tiles that appear from top */
  newTiles: NewTile[];
}

/**
 * Compute the full gravity result: shift tiles down, fill empty spaces.
 * Pure function — no side effects, fully testable.
 *
 * Algorithm per column (bottom to top):
 * 1. Collect all non-cleared tiles
 * 2. Stack them at the bottom
 * 3. Calculate fall distance for each moved tile
 * 4. Generate new letters for empty spaces at the top
 */
export function computeGravityResult(
  grid: LetterGrid,
  tileStates: BlastTileState[][],
  gridSize: number,
  language: Language,
  specialTileChance: number
): GravityResult {
  const newGrid: LetterGrid = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => '')
  );
  const newTileStates: BlastTileState[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({
      row: 0, col: 0, type: 'standard' as BlastTileType, isCleared: false, activationEffect: null, hitsRemaining: 0,
    }))
  );
  const clearedTiles: ClearedTile[] = [];
  const fallingTiles: FallingTile[] = [];
  const newTiles: NewTile[] = [];

  // Collect cleared tile positions for clearing animation
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (tileStates[row]?.[col]?.isCleared) {
        clearedTiles.push({
          row,
          col,
          letter: grid[row]?.[col] ?? '',
          type: tileStates[row][col].type,
        });
      }
    }
  }

  for (let col = 0; col < gridSize; col++) {
    // Collect surviving tiles from bottom to top
    const survivors: Array<{ letter: string; type: BlastTileType; originalRow: number; hitsRemaining: number }> = [];
    for (let row = gridSize - 1; row >= 0; row--) {
      if (!tileStates[row][col].isCleared) {
        survivors.push({
          letter: grid[row][col],
          type: tileStates[row][col].type,
          originalRow: row,
          hitsRemaining: tileStates[row][col].hitsRemaining,
        });
      }
    }

    // Place survivors from bottom up
    let bottomRow = gridSize - 1;
    for (const survivor of survivors) {
      newGrid[bottomRow][col] = survivor.letter;
      newTileStates[bottomRow][col] = {
        row: bottomRow,
        col,
        type: survivor.type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: survivor.hitsRemaining,
      };

      const fallDist = bottomRow - survivor.originalRow;
      if (fallDist > 0) {
        fallingTiles.push({
          row: bottomRow,
          col,
          letter: survivor.letter,
          type: survivor.type,
          fallDistance: fallDist,
        });
      }

      bottomRow--;
    }

    // Fill empty top rows with new letters
    const emptyCount = bottomRow + 1;
    for (let i = 0; i < emptyCount; i++) {
      const row = bottomRow - i; // top-most first
      const letter = generateBlastLetter(language);
      const type = rollSpecialType(specialTileChance);

      newGrid[row][col] = letter;
      newTileStates[row][col] = {
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: type === 'ice' ? 2 : 0,
      };

      newTiles.push({
        row,
        col,
        letter,
        type,
        spawnOffset: emptyCount - i, // furthest from top gets highest offset
      });
    }
  }

  return { newGrid, newTileStates, clearedTiles, fallingTiles, newTiles };
}

/** Count cleared tiles in the grid */
export function countCleared(tileStates: BlastTileState[][]): number {
  return tileStates.flat().filter(t => t.isCleared).length;
}
