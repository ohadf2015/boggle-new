/**
 * Adventure Mode Themes Index
 *
 * Exports all world themes and provides getters for theme data.
 * This is the main entry point for the theming system.
 */

import type { WorldTheme, TileVisualConfig, ChapterConfig } from './types';
import type { TileType } from '@/types/adventure';
import logger from '@/utils/logger';

// Import individual world themes
import { WORLD_1_THEME } from './world1';
import { WORLD_2_THEME } from './world2';
import { WORLD_3_THEME } from './world3';
import { WORLD_4_THEME } from './world4';
import { WORLD_5_THEME } from './world5';
import { WORLD_6_THEME } from './world6';
import { WORLD_7_THEME } from './world7';
import { WORLD_8_THEME } from './world8';
import { WORLD_9_THEME } from './world9';
import { WORLD_10_THEME } from './world10';

// ==============================================
// THEME REGISTRY
// ==============================================

/**
 * Registry of all world themes, indexed by world ID
 */
const WORLD_THEMES: Record<number, WorldTheme> = {
  1: WORLD_1_THEME,
  2: WORLD_2_THEME,
  3: WORLD_3_THEME,
  4: WORLD_4_THEME,
  5: WORLD_5_THEME,
  6: WORLD_6_THEME,
  7: WORLD_7_THEME,
  8: WORLD_8_THEME,
  9: WORLD_9_THEME,
  10: WORLD_10_THEME,
};

// ==============================================
// THEME GETTERS
// ==============================================

/**
 * Get the complete theme configuration for a world
 *
 * @param worldId - World number (1-10)
 * @returns WorldTheme configuration
 * @throws Error if worldId is invalid (logs warning and returns World 1 as fallback)
 */
export function getWorldTheme(worldId: number): WorldTheme {
  // world=0 is a sentinel for endless/weekly modes — use World 1 theme
  if (worldId === 0) {
    return WORLD_THEMES[1];
  }

  const theme = WORLD_THEMES[worldId];

  if (!theme) {
    logger.debug(`Invalid world ID: ${worldId}. Falling back to World 1 theme.`);
    return WORLD_THEMES[1];
  }

  return theme;
}

/**
 * Get tile visual configuration for a specific tile type in a world
 *
 * @param worldId - World number (1-10)
 * @param tileType - Type of tile
 * @returns TileVisualConfig for the tile
 */
export function getTileVisualConfig(worldId: number, tileType: TileType): TileVisualConfig {
  const theme = getWorldTheme(worldId);
  return theme.tileStyles[tileType] ?? theme.tileStyles['standard']!;
}

/**
 * Get chapter configuration for a specific level
 *
 * @param worldId - World number (1-10)
 * @param level - Level number within world (1-7)
 * @returns ChapterConfig for the level's chapter
 */
export function getChapterForLevel(worldId: number, level: number): ChapterConfig {
  const theme = getWorldTheme(worldId);

  // 2-2-3 structure: levels 1-2 = chapter 1, 3-4 = chapter 2, 5-7 = chapter 3
  if (level <= 2) return theme.chapters[0];
  if (level <= 4) return theme.chapters[1];
  return theme.chapters[2];
}

/**
 * Get chapter number for a level (1-3)
 *
 * @param level - Level number within world (1-7)
 * @returns Chapter number (1-3)
 */
export function getChapterNumber(level: number): 1 | 2 | 3 {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  return 3;
}

/**
 * Get level position within its chapter
 *
 * @param level - Level number within world (1-7)
 * @returns Position within chapter (1-3)
 */
export function getLevelInChapter(level: number): 1 | 2 | 3 {
  if (level <= 2) return level as 1 | 2;
  if (level <= 4) return (level - 2) as 1 | 2;
  return (level - 4) as 1 | 2 | 3;
}

/**
 * Check if a level is a boss level (last level of world)
 *
 * @param level - Level number within world (1-7)
 * @returns true if this is the boss level
 */
export function isBossLevel(level: number): boolean {
  return level === 7;
}

/**
 * Get all registered world themes
 *
 * @returns Array of all world themes
 */
export function getAllWorldThemes(): WorldTheme[] {
  return Object.values(WORLD_THEMES);
}

/**
 * Check if a world theme is fully implemented
 *
 * @param worldId - World number (1-10)
 * @returns true if the theme is fully implemented
 */
export function isThemeImplemented(worldId: number): boolean {
  return worldId >= 1 && worldId <= 10;
}

// ==============================================
// EXPORTS
// ==============================================

// Re-export types for convenience
export type {
  WorldTheme,
  TileVisualConfig,
  ChapterConfig,
  WorldBackground,
  WorldAnimations,
  WorldColorPalette,
  ModifierDisplayConfig,
  ParallaxLayer,
  TextureConfig,
  ParticleConfig,
  EntryAnimationType,
} from './types';

// Re-export individual themes for direct access
export { WORLD_1_THEME } from './world1';
export { WORLD_2_THEME } from './world2';
export { WORLD_3_THEME } from './world3';
export { WORLD_4_THEME } from './world4';
export { WORLD_5_THEME } from './world5';
export { WORLD_6_THEME } from './world6';
export { WORLD_7_THEME } from './world7';
export { WORLD_8_THEME } from './world8';
export { WORLD_9_THEME } from './world9';
export { WORLD_10_THEME } from './world10';
