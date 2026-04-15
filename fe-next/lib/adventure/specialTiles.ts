/**
 * Special tile placement for adventure levels.
 * Split from levelConfig.ts — gold/ice/bomb/time tile RNG placement with
 * vowel protection (ice avoids vowels), archetype modifiers, and the
 * Gem Detector upgrade boost.
 */

import type { SpecialTile, TileType, LevelArchetype } from '@/types/adventure';
import { TILE_TYPES } from './constants';
import { VOWELS } from './gridGenerator';
import { getArchetypeForLevel, getArchetypeConfig } from './levelArchetypes';

/** Set of vowels for ice tile protection (case-insensitive check) */
const VOWEL_SET = new Set(VOWELS.map((v) => v.toUpperCase()));

/**
 * Check if a letter is a vowel (supports multiple languages).
 * Ice tiles should not be placed on vowels to ensure levels are completable.
 */
function isVowel(letter: string): boolean {
  return VOWEL_SET.has(letter.toUpperCase());
}

/**
 * Generate special tiles for a level.
 *
 * @param grid - Optional letter grid for vowel protection (ice tiles won't land on vowels)
 */
export function generateSpecialTiles(
  world: number,
  level: number,
  gridSize: number,
  grid?: string[][],
  archetype?: LevelArchetype
): SpecialTile[] {
  const effectiveArchetype = archetype ?? getArchetypeForLevel(world, level);
  const { tileModifiers } = getArchetypeConfig(effectiveArchetype);
  const tiles: SpecialTile[] = [];
  const usedPositions = new Set<string>();

  const addTile = (type: TileType): void => {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;

      if (usedPositions.has(posKey)) {
        attempts++;
        continue;
      }

      // Vowel protection: Ice tiles should not be placed on vowels
      // to prevent RNG-based unfair levels where critical vowels are frozen.
      if (type === 'ice' && grid) {
        const letter = grid[row]?.[col];
        if (letter && isVowel(letter)) {
          attempts++;
          continue;
        }
      }

      usedPositions.add(posKey);
      tiles.push({ row, col, type });
      return;
    }
  };

  // World 1: No special tiles for levels 1-4 (tutorial chapters 1-2).
  // Introduce gold tiles in boss chapter (levels 5-7).
  if (world === 1 && level < 5) {
    return tiles;
  }

  // Cap: max ~25% of grid can be special tiles
  const maxSpecialTiles = Math.floor(gridSize * gridSize * 0.25);

  // Gold tiles: World 1 level 5+ (boss chapter), World 2+ all levels
  if ((world === 1 && level >= 5) || world >= 2) {
    const baseGold = Math.min(1 + Math.floor((world - 1) / 2), 3);
    const goldCount = Math.min(Math.round(baseGold * tileModifiers.goldMultiplier), 3);
    for (let i = 0; i < goldCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.GOLD as TileType);
    }
  }

  // Ice tiles: World 2+ (or any world if archetype demands it)
  if (world >= 2 || tileModifiers.iceMultiplier > 1) {
    const baseIce = Math.min(1 + Math.floor(level / 3) + Math.floor((Math.max(world, 2) - 2) / 2), 4);
    const iceCount = Math.min(Math.round(baseIce * tileModifiers.iceMultiplier), 5);
    for (let i = 0; i < iceCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.ICE as TileType);
    }
  }

  // Bomb tiles: World 3+, level 3+
  if (world >= 3 && level >= 3) {
    const bombCount = Math.min(Math.round(1 * tileModifiers.bombMultiplier), 2);
    for (let i = 0; i < bombCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.BOMB as TileType);
    }
  }

  // Time tiles: World 3+, level 2+ — strategic lifeline (+5s each)
  if (world >= 3 && level >= 2) {
    const baseTime = level >= 5 ? 2 : 1;
    const timeCount = Math.min(Math.round(baseTime * tileModifiers.timeMultiplier), 2);
    for (let i = 0; i < timeCount && tiles.length < maxSpecialTiles; i++) {
      addTile(TILE_TYPES.TIME as TileType);
    }
  }

  return tiles;
}

/**
 * Apply Gem Detector upgrade boost to special tiles.
 * - specialTileBoost (T1-2): adds extra gold tiles proportional to boost %
 * - guaranteedGoldTile (T3): ensures at least 1 gold tile after cascade
 */
export function applyGemDetectorBoost(
  tiles: SpecialTile[],
  gridSize: number,
  specialTileBoost: number,
  guaranteedGoldTile: boolean
): SpecialTile[] {
  if (specialTileBoost <= 0 && !guaranteedGoldTile) return tiles;

  const result = [...tiles];
  const usedPositions = new Set(tiles.map(t => `${t.row},${t.col}`));

  const addGoldTile = (): boolean => {
    let attempts = 0;
    while (attempts < 100) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;
      if (!usedPositions.has(posKey)) {
        usedPositions.add(posKey);
        result.push({ row, col, type: TILE_TYPES.GOLD as TileType });
        return true;
      }
      attempts++;
    }
    return false;
  };

  // specialTileBoost: add extra gold tiles (e.g. 0.2 = +20% → ~1 extra)
  if (specialTileBoost > 0) {
    const currentGoldCount = tiles.filter(t => t.type === 'gold').length;
    const extraGold = Math.max(1, Math.round(currentGoldCount * specialTileBoost));
    for (let i = 0; i < extraGold; i++) {
      addGoldTile();
    }
  }

  // guaranteedGoldTile: ensure at least 1 gold tile exists
  if (guaranteedGoldTile) {
    const hasGold = result.some(t => t.type === 'gold');
    if (!hasGold) {
      addGoldTile();
    }
  }

  return result;
}
