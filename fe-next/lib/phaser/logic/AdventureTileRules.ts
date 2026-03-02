/**
 * AdventureTileRules — pure functions for adventure mode tile effects.
 *
 * All functions are immutable (return new objects, never mutate).
 * Imported by AdventureScene (Phaser) and can also be used server-side.
 */

import type { TileType } from '@/types/adventure';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdventureTile {
  id: string;
  row: number;
  col: number;
  letter: string;
  type: TileType;
  isCleared: boolean;
  isFrozen: boolean;
  bonusTime: number;
}

// ─── applyIceMelt ────────────────────────────────────────────────────────────

/**
 * Mark an ice tile as cleared and unfrozen.
 * Returns the input tile unchanged for non-ice types (no-op).
 */
export function applyIceMelt(tile: AdventureTile): AdventureTile {
  return { ...tile, isCleared: true, isFrozen: false };
}

// ─── applyBombEffect ─────────────────────────────────────────────────────────

/**
 * Clear all tiles in the same row as the bomb tile.
 * Returns a new grid array; the original is not mutated.
 */
export function applyBombEffect(
  grid: AdventureTile[],
  bombRow: number,
  _bombCol: number
): AdventureTile[] {
  return grid.map((tile) => {
    if (tile.row === bombRow) {
      return { ...tile, isCleared: true };
    }
    return tile;
  });
}

// ─── getFireMultiplier ────────────────────────────────────────────────────────

/**
 * Returns the score multiplier for a fire-round tile based on current combo level.
 * Multiplier scales linearly; minimum is 1× (no penalty for low combos).
 */
export function getFireMultiplier(comboLevel: number): number {
  return Math.max(1, 1 + comboLevel * 0.25);
}

// ─── applyTimeBonus ──────────────────────────────────────────────────────────

/**
 * Returns the number of bonus seconds granted by collecting a time tile.
 * Returns 0 for non-time tiles.
 */
export function applyTimeBonus(tile: AdventureTile): number {
  if (tile.type !== 'time') return 0;
  return tile.bonusTime;
}

// ─── isRainbowTile ───────────────────────────────────────────────────────────

/**
 * Returns true when the tile is a rainbow/wildcard tile.
 */
export function isRainbowTile(tile: AdventureTile): boolean {
  return tile.type === 'rainbow';
}
