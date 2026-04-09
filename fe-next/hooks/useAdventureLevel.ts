/**
 * useAdventureLevel Hook
 *
 * Provides level configuration and world metadata for adventure gameplay.
 * Handles level config retrieval, boss level detection, and global level numbering.
 */

import { useMemo } from 'react';
import type { LevelConfig } from '@/types/adventure';
import {
  getLevelConfig,
  getWorldConfig,
  type WorldConfig,
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
} from '@/lib/adventure';

// ==============================================
// TYPES
// ==============================================

interface UseAdventureLevelReturn {
  /** Level configuration */
  levelConfig: LevelConfig | null;
  /** World configuration */
  worldConfig: WorldConfig | null;
  /** Whether this is a boss level (final level of the world) */
  isBossLevel: boolean;
  /** Global level number (1-70) */
  globalLevelNumber: number;
  /** Error if invalid world/level */
  error: Error | null;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to get adventure level configuration
 *
 * @param world - World number (1-10)
 * @param level - Level number within world (1-7)
 * @returns Level config, world config, and metadata
 */
export function useAdventureLevel(
  world: number,
  level: number
): UseAdventureLevelReturn {
  // Validate inputs and get configs
  const { levelConfig, worldConfig, error } = useMemo(() => {
    // Validate world (world=0 is valid for weekly challenges)
    if (world !== 0 && (world < 1 || world > WORLDS_COUNT)) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: new Error(`Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`),
      };
    }

    // Validate level — endless mode (world=0) allows unbounded floor numbers
    if (world === 0 && level < 1) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: new Error('Invalid endless floor: must be >= 1.'),
      };
    }
    if (world !== 0 && (level < 1 || level > LEVELS_PER_WORLD)) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: new Error(`Invalid level: ${level}. Must be between 1 and ${LEVELS_PER_WORLD}.`),
      };
    }

    try {
      const levelCfg = getLevelConfig(world, level);
      const worldCfg = getWorldConfig(world);
      return {
        levelConfig: levelCfg,
        worldConfig: worldCfg,
        error: null,
      };
    } catch (err) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: err instanceof Error ? err : new Error('Failed to get level config'),
      };
    }
  }, [world, level]);

  // Compute derived values
  const isBossLevel = useMemo(() => {
    return level === LEVELS_PER_WORLD; // Level 7 is boss level (final level of world)
  }, [level]);

  const globalLevelNumber = useMemo(() => {
    return (world - 1) * LEVELS_PER_WORLD + level;
  }, [world, level]);

  return {
    levelConfig,
    worldConfig,
    isBossLevel,
    globalLevelNumber,
    error,
  };
}

// ==============================================
// EXPORTS
// ==============================================

export type { UseAdventureLevelReturn };
