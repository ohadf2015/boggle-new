import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from '../types';
import { generateBlastLetter, rollSpecialType } from './blastLetterGenerator';
import { getInitialHitsRemaining } from './blastTileUtils';
import { nextTileUid } from './blastTileGeneration';

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
 * Generate a letter that differs from its vertical neighbor to prevent
 * repetitive clusters after cascade refills. Retries up to `maxRetries`
 * times using the provided RNG; falls back to the last attempt if all
 * retries produce duplicates. Deterministic when using a seeded RNG.
 */
export function generateNonDuplicateLetter(
  language: Language,
  rng: () => number,
  neighborLetters: string[],
  maxRetries = 5,
): string {
  let letter = generateBlastLetter(language, 1.0, rng);
  for (let attempt = 0; attempt < maxRetries && neighborLetters.includes(letter); attempt++) {
    letter = generateBlastLetter(language, 1.0, rng);
  }
  return letter;
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
  specialTileChance: number,
  customDistribution?: Record<string, number>,
  /** DDA spawn modifier — added to specialTileChance for new-tile rolls (see blastDDA.ts) */
  spawnModifier = 0,
  /**
   * Optional seeded RNG for deterministic multiplayer refills.
   * When provided (via createSeededRandom(seed)), all new tile generation uses
   * this RNG, making refills identical across clients sharing the same seed.
   * Omit (or pass undefined) for singleplayer — defaults to Math.random.
   * NOTE: Boards remain client-authoritative; seeded refill reduces divergence
   *       but does not guarantee lockstep (different words clear different cells).
   */
  rng?: () => number,
  /**
   * When false, empty top rows are NOT filled with new tiles after gravity.
   * The board shrinks as the player clears words — a puzzle/board-clear mechanic.
   * Defaults to true (original behavior: always refill from top).
   */
  refill = true,
): GravityResult {
  const newGrid: LetterGrid = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => '')
  );
  const newTileStates: BlastTileState[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({
      // Fail CLOSED: any cell the column loop never writes (jagged/mismatched
      // input) stays cleared/invisible rather than a selectable blank tile.
      uid: '', row: 0, col: 0, type: 'standard' as BlastTileType, isCleared: true, activationEffect: null, hitsRemaining: 0,
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
    type Survivor = { uid: string; letter: string; type: BlastTileType; originalRow: number; hitsRemaining: number } & Pick<BlastTileState, 'innerType' | 'isThawed' | 'countdown' | 'portalPairId' | 'crystalMultiplier' | 'fuseGroupId' | 'fuseTimer' | 'colorTag'>;
    const survivors: Survivor[] = [];
    for (let row = gridSize - 1; row >= 0; row--) {
      const t = tileStates[row][col];
      if (!t.isCleared) {
        survivors.push({
          uid: t.uid,
          letter: grid[row][col],
          type: t.type,
          originalRow: row,
          hitsRemaining: t.hitsRemaining,
          ...(t.innerType != null ? { innerType: t.innerType } : {}),
          ...(t.isThawed ? { isThawed: true } : {}),
          ...(t.countdown != null ? { countdown: t.countdown } : {}),
          ...(t.portalPairId != null ? { portalPairId: t.portalPairId } : {}),
          ...(t.crystalMultiplier != null ? { crystalMultiplier: t.crystalMultiplier } : {}),
          ...(t.fuseGroupId != null ? { fuseGroupId: t.fuseGroupId } : {}),
          ...(t.fuseTimer != null ? { fuseTimer: t.fuseTimer } : {}),
          ...(t.colorTag != null ? { colorTag: t.colorTag } : {}),
        });
      }
    }

    // Place survivors from bottom up
    let bottomRow = gridSize - 1;
    for (const survivor of survivors) {
      newGrid[bottomRow][col] = survivor.letter;
      newTileStates[bottomRow][col] = {
        uid: survivor.uid,
        row: bottomRow,
        col,
        type: survivor.type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: survivor.hitsRemaining,
        ...(survivor.innerType != null ? { innerType: survivor.innerType } : {}),
        ...(survivor.isThawed ? { isThawed: true } : {}),
        ...(survivor.countdown != null ? { countdown: survivor.countdown } : {}),
        ...(survivor.portalPairId != null ? { portalPairId: survivor.portalPairId } : {}),
        ...(survivor.crystalMultiplier != null ? { crystalMultiplier: survivor.crystalMultiplier } : {}),
        ...(survivor.fuseGroupId != null ? { fuseGroupId: survivor.fuseGroupId } : {}),
        ...(survivor.fuseTimer != null ? { fuseTimer: survivor.fuseTimer } : {}),
        ...(survivor.colorTag != null ? { colorTag: survivor.colorTag } : {}),
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

    // Fill empty top rows with new letters (or leave empty if refill=false)
    const emptyCount = bottomRow + 1;
    if (refill) {
      for (let i = 0; i < emptyCount; i++) {
        const row = bottomRow - i; // top-most first
        // Collect neighbors to avoid: tile below + left + right (prevents both vertical & horizontal match-3)
        const neighbors: string[] = [];
        const below = newGrid[row + 1]?.[col];
        if (below) neighbors.push(below);
        const left = newGrid[row]?.[col - 1];
        if (left) neighbors.push(left);
        const right = newGrid[row]?.[col + 1];
        if (right) neighbors.push(right);
        const letter = generateNonDuplicateLetter(
          language,
          rng ?? Math.random,
          neighbors,
          5,
        );
        const type = rollSpecialType(specialTileChance, customDistribution, spawnModifier, rng);

        newGrid[row][col] = letter;
        newTileStates[row][col] = {
          uid: nextTileUid(),
          row,
          col,
          type,
          isCleared: false,
          activationEffect: type !== 'standard' ? 'tile-earned' : null,
          hitsRemaining: getInitialHitsRemaining(type),
        };

        newTiles.push({
          row,
          col,
          letter,
          type,
          spawnOffset: emptyCount - i, // topmost new tile (furthest travel) gets highest offset
        });
      }
    } else {
      // No refill — mark empty top cells as cleared (invisible)
      for (let row = 0; row <= bottomRow; row++) {
        newGrid[row][col] = '';
        newTileStates[row][col] = {
          uid: nextTileUid(),
          row,
          col,
          type: 'standard',
          isCleared: true,
          activationEffect: null,
          hitsRemaining: 0,
        };
      }
    }
  }

  // Invariant: a playable (non-cleared) cell must ALWAYS carry a letter.
  // Gravity runs after every clear / cascade / explosion / vortex pull, so this
  // single chokepoint repairs any blank stranded upstream (vortex letter-swap
  // races, unseeded shuffle, server↔client board desync) — the cell keeps its
  // tile identity but regains a glyph, so the board never renders a selectable
  // empty tile. Uses the same neighbor-aware generator + RNG as refill, so
  // seeded multiplayer refills stay deterministic in the (rare) repair case.
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const ts = newTileStates[row]?.[col];
      if (ts && !ts.isCleared && !newGrid[row]?.[col]) {
        const neighbors: string[] = [];
        const below = newGrid[row + 1]?.[col];
        if (below) neighbors.push(below);
        const left = newGrid[row]?.[col - 1];
        if (left) neighbors.push(left);
        const right = newGrid[row]?.[col + 1];
        if (right) neighbors.push(right);
        newGrid[row][col] = generateNonDuplicateLetter(language, rng ?? Math.random, neighbors, 5);
      }
    }
  }

  return { newGrid, newTileStates, clearedTiles, fallingTiles, newTiles };
}

/** Count cleared tiles in the grid */
export function countCleared(tileStates: BlastTileState[][]): number {
  return tileStates.flat().filter(t => t.isCleared).length;
}
