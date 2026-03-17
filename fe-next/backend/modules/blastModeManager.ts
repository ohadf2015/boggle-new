/**
 * Blast Mode Manager
 * Handles blast mode overlay generation, tile bonuses, and move tracking
 * for multiplayer blast games.
 */

import type { BlastTileOverlay, BlastModeState, BlastPlayerStats } from '@/shared/types/game';

import type { BlastTileType } from '@/shared/types/blast';

import {
  BLAST_BONUS_MOVE_COMBO_THRESHOLD,
  BLAST_SPECIAL_TILE_CHANCE,
  BLAST_TILE_BONUSES,
  BLAST_RAINBOW_FLAT_BONUS,
} from '@/shared/constants/blastMultiplayerConstants';

import { getWaveConfig, getWaveDistribution } from '@/components/blast/utils/blastWaveConfig';
import { rollSpecialType } from '@/components/blast/utils/blastLetterGenerator';

/**
 * Generate blast tile overlay for a grid using wave-aware tile distribution.
 * For each cell, rolls using rollSpecialType with the wave's distribution so
 * tile availability matches singleplayer progression (e.g., diamond only wave 4+).
 *
 * @param grid - The letter grid
 * @param specialChance - Base probability of a special tile [0, 1]
 * @param wave - Current wave number (defaults to 1); gates which tile types can appear
 * @returns Array of special tile overlays (standard tiles omitted)
 */
export function generateBlastOverlay(
  grid: string[][],
  specialChance: number,
  wave = 1
): BlastTileOverlay[] {
  const overlay: BlastTileOverlay[] = [];
  const waveConfig = getWaveConfig(wave);
  const distribution = getWaveDistribution(waveConfig);

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const tileType = rollSpecialType(specialChance, distribution);
      if (tileType !== 'standard') {
        overlay.push({ row, col, type: tileType as BlastTileType });
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
 *
 * @param grid - The letter grid
 * @param players - Player usernames
 * @param wave - Current wave number (defaults to 1); passed to generateBlastOverlay for tile gating
 */
export function initBlastModeState(
  grid: string[][],
  players: string[],
  wave = 1
): BlastModeState {
  const overlay = generateBlastOverlay(grid, BLAST_SPECIAL_TILE_CHANCE, wave);

  const playerMoves: Record<string, number> = {};
  const playerBonusMoves: Record<string, number> = {};
  const playerStats: Record<string, BlastPlayerStats> = {};

  for (const player of players) {
    playerMoves[player] = 0;
    playerBonusMoves[player] = 0;
    playerStats[player] = { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 };
  }

  // Generate a seed for deterministic multiplayer refills.
  // XOR of timestamp and a random value to minimize collisions.
  // Use >>> 0 to ensure unsigned 32-bit positive integer; || 1 avoids zero.
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0 || 1;

  // Build cached overlay lookup map for O(1) getTilesOnPath queries
  const overlayMap = new Map<string, BlastTileType>();
  for (const tile of overlay) {
    overlayMap.set(`${tile.row},${tile.col}`, tile.type);
  }

  return { overlay, overlayMap, playerMoves, playerBonusMoves, playerStats, seed };
}

/**
 * Record a blast move for a player.
 * Increments moves and grants bonus move if combo is high enough.
 */
export function recordBlastMove(
  state: BlastModeState,
  username: string,
  comboLevel: number,
  word?: string,
  tilesCleared?: number,
  gemCount?: number,
  tileBonus?: number,
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

  // Update rich per-player stats
  if (state.playerStats) {
    if (!state.playerStats[username]) {
      state.playerStats[username] = { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 };
    }
    const stats = state.playerStats[username];
    if (comboLevel > stats.maxCombo) stats.maxCombo = comboLevel;
    if (word) {
      stats.wordsFound.push(word);
      if (word.length > stats.bestWord.length) stats.bestWord = word;
    }
    if (tilesCleared) stats.tilesCleared += tilesCleared;
    if (gemCount) stats.gemsCollected += gemCount;
    if (tileBonus) stats.totalTileBonus = (stats.totalTileBonus || 0) + tileBonus;
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
  overlay: BlastTileOverlay[],
  cachedOverlayMap?: Map<string, BlastTileType>
): BlastTileType[] {
  const tiles: BlastTileType[] = [];

  // Use cached map if provided, otherwise build one from overlay array
  const overlayMap = cachedOverlayMap ?? new Map<string, BlastTileType>();
  if (!cachedOverlayMap) {
    for (const tile of overlay) {
      overlayMap.set(`${tile.row},${tile.col}`, tile.type);
    }
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
