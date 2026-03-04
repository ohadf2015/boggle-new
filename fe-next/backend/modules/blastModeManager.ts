/**
 * Blast Mode Manager
 * Handles blast mode overlay generation, tile bonuses, and move tracking
 * for multiplayer blast games.
 */

import type { BlastTileOverlay, BlastModeState } from '@/shared/types/game';

import type { BlastTileType } from '@/shared/types/blast';

import {
  BLAST_BONUS_MOVE_COMBO_THRESHOLD,
  BLAST_SPECIAL_TILE_CHANCE,
  BLAST_TILE_TYPES,
  BLAST_TILE_BONUSES,
  BLAST_RAINBOW_FLAT_BONUS,
} from '@/shared/constants/blastMultiplayerConstants';

/**
 * Generate blast tile overlay for a grid.
 * For each cell, rolls random; if < specialChance, assigns random special type.
 * Returns array of special tiles only (normal tiles not included).
 */
export function generateBlastOverlay(
  grid: string[][],
  specialChance: number
): BlastTileOverlay[] {
  const overlay: BlastTileOverlay[] = [];
  const specialTypes = BLAST_TILE_TYPES.filter(t => t !== 'standard');

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (Math.random() < specialChance) {
        const randomType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
        overlay.push({ row, col, type: randomType });
      }
    }
  }

  return overlay;
}

/**
 * Calculate tile bonus for tiles on a word path.
 * Sums up bonus multipliers from BLAST_TILE_BONUSES.
 * If rainbow is in path, adds BLAST_RAINBOW_FLAT_BONUS as flat addition (once).
 */
export function calculateBlastTileBonus(tilesOnPath: BlastTileType[]): number {
  if (tilesOnPath.length === 0) return 0;

  let total = 0;
  let hasRainbow = false;

  for (const tileType of tilesOnPath) {
    total += BLAST_TILE_BONUSES[tileType];
    if (tileType === 'rainbow') {
      hasRainbow = true;
    }
  }

  if (hasRainbow) {
    total += BLAST_RAINBOW_FLAT_BONUS;
  }

  return total;
}

/**
 * Initialize blast mode state for a new game.
 * Generates overlay, initializes move tracking for all players.
 */
export function initBlastModeState(
  grid: string[][],
  players: string[]
): BlastModeState {
  const overlay = generateBlastOverlay(grid, BLAST_SPECIAL_TILE_CHANCE);

  const playerMoves: Record<string, number> = {};
  const playerBonusMoves: Record<string, number> = {};

  for (const player of players) {
    playerMoves[player] = 0;
    playerBonusMoves[player] = 0;
  }

  return { overlay, playerMoves, playerBonusMoves };
}

/**
 * Record a blast move for a player.
 * Increments moves and grants bonus move if combo is high enough.
 */
export function recordBlastMove(
  state: BlastModeState,
  username: string,
  comboLevel: number
): { movesUsed: number; bonusMove: boolean } {
  // Initialize if unknown player
  if (state.playerMoves[username] === undefined) {
    state.playerMoves[username] = 0;
  }
  if (state.playerBonusMoves[username] === undefined) {
    state.playerBonusMoves[username] = 0;
  }

  state.playerMoves[username] += 1;

  const bonusMove = comboLevel >= BLAST_BONUS_MOVE_COMBO_THRESHOLD;
  if (bonusMove) {
    state.playerBonusMoves[username] += 1;
  }

  return {
    movesUsed: state.playerMoves[username],
    bonusMove,
  };
}

/**
 * Get tile types for each letter in a word based on grid positions and overlay.
 * For each letter, finds its grid position and checks if it has a special tile.
 */
export function getTilesOnPath(
  word: string,
  letterPositions: Map<string, Array<{ row: number; col: number }>>,
  overlay: BlastTileOverlay[]
): BlastTileType[] {
  const tiles: BlastTileType[] = [];

  // Build a lookup map for overlay positions
  const overlayMap = new Map<string, BlastTileType>();
  for (const tile of overlay) {
    overlayMap.set(`${tile.row},${tile.col}`, tile.type);
  }

  // Track used positions to handle duplicate letters
  const usedPositions = new Set<string>();

  for (const letter of word.toLowerCase()) {
    const positions = letterPositions.get(letter);
    if (!positions || positions.length === 0) continue;

    // Find first unused position for this letter
    let foundPosition = false;
    for (const pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        const tileType = overlayMap.get(key) || 'standard';
        tiles.push(tileType);
        foundPosition = true;
        break;
      }
    }

    // If all positions used, use first position anyway
    if (!foundPosition && positions.length > 0) {
      const pos = positions[0];
      const key = `${pos.row},${pos.col}`;
      const tileType = overlayMap.get(key) || 'standard';
      tiles.push(tileType);
    }
  }

  return tiles;
}
