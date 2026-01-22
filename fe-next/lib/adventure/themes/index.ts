/**
 * Adventure Mode Themes Index
 *
 * Exports all world themes and provides getters for theme data.
 * This is the main entry point for the theming system.
 */

import type { WorldTheme, TileVisualConfig, ChapterConfig, DEFAULT_TILE_CONFIG } from './types';
import type { TileType } from '@/types/adventure';

// Import individual world themes
import { WORLD_1_THEME } from './world1';
import { WORLD_2_THEME } from './world2';
import { WORLD_3_THEME } from './world3';

// ==============================================
// THEME REGISTRY
// ==============================================

/**
 * Registry of all world themes, indexed by world ID
 * Worlds 4-10 use placeholder themes until fully implemented
 */
const WORLD_THEMES: Record<number, WorldTheme> = {
  1: WORLD_1_THEME,
  2: WORLD_2_THEME,
  3: WORLD_3_THEME,
  // Worlds 4-10: Temporary placeholders using World 1 as base
  // TODO: Implement full themes for worlds 4-10
  4: createPlaceholderTheme(4, 'idiomArchipelago', 'tropical-islands', 'idioms', 'neo-orange'),
  5: createPlaceholderTheme(5, 'compoundCanyon', 'desert-cliffs', 'compounds', 'neo-red'),
  6: createPlaceholderTheme(6, 'anagramLabyrinth', 'escher-maze', 'anagrams', 'neo-pink'),
  7: createPlaceholderTheme(7, 'mirrorPalace', 'reflective-glass', 'palindromes', 'neo-cyan'),
  8: createPlaceholderTheme(8, 'neologismNebula', 'space-stars', 'rareWords', 'neo-purple'),
  9: createPlaceholderTheme(9, 'polyglotPeaks', 'mountain-aurora', 'multilingual', 'neo-cyan'),
  10: createPlaceholderTheme(10, 'lexiconThrone', 'golden-library', 'allMechanics', 'neo-yellow'),
};

// ==============================================
// PLACEHOLDER THEME FACTORY
// ==============================================

/**
 * Creates a placeholder theme based on World 1 with different colors
 * Used for worlds 4-10 until full themes are implemented
 */
function createPlaceholderTheme(
  id: number,
  nameKey: string,
  themeId: string,
  mechanic: string,
  primaryColor: string
): WorldTheme {
  return {
    ...WORLD_1_THEME,
    id,
    nameKey: `adventure.worlds.${nameKey}`,
    themeId,
    mechanic,
    colors: {
      ...WORLD_1_THEME.colors,
      primary: primaryColor,
      secondary: `${primaryColor}-light`,
    },
    modifierDisplay: {
      ...WORLD_1_THEME.modifierDisplay,
      visible: true,
      backgroundColor: `bg-${primaryColor}/20`,
      borderColor: `border-${primaryColor}`,
      textColor: `text-${primaryColor}`,
    },
    chapters: [
      {
        number: 1,
        nameKey: `adventure.chapters.${nameKey}.zone1`,
        levelCount: 2,
        startLevel: 1,
        isBossChapter: false,
        accentColor: primaryColor,
      },
      {
        number: 2,
        nameKey: `adventure.chapters.${nameKey}.zone2`,
        levelCount: 2,
        startLevel: 3,
        isBossChapter: false,
        accentColor: primaryColor,
      },
      {
        number: 3,
        nameKey: `adventure.chapters.${nameKey}.bossZone`,
        levelCount: 3,
        startLevel: 5,
        isBossChapter: true,
        accentColor: primaryColor,
      },
    ],
    containerClass: `world-${themeId.replace('-', '')}`,
  };
}

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
  const theme = WORLD_THEMES[worldId];

  if (!theme) {
    console.warn(`Invalid world ID: ${worldId}. Falling back to World 1 theme.`);
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
  return theme.tileStyles[tileType];
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
 * Check if a world theme is fully implemented (not a placeholder)
 *
 * @param worldId - World number (1-10)
 * @returns true if the theme is fully implemented
 */
export function isThemeImplemented(worldId: number): boolean {
  // Worlds 1-3 are fully implemented
  return worldId >= 1 && worldId <= 3;
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
