/**
 * Adventure Mode Library
 *
 * Central export point for adventure mode constants and configurations.
 */

// Constants and utility functions
export {
  // Core constants
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  TOTAL_LEVELS,
  MAX_PLAYER_LEVEL,
  // XP constants
  BASE_COMPLETION_XP,
  XP_PER_STAR,
  MAX_LEVEL_XP,
  // Star & unlock progression
  STARS_TO_UNLOCK_NEXT_LEVEL,
  STARS_TO_UNLOCK_NEXT_WORLD,
  TOTAL_STARS_FOR_FINAL_WORLD,
  MAX_STARS_PER_LEVEL,
  MAX_STARS_PER_WORLD,
  // Tile and objective constants
  TILE_TYPES,
  OBJECTIVE_TYPES,
  // Grid and timer configuration
  GRID_SIZES,
  TIMER_DURATIONS,
  getGridSize,
  getTimerDuration,
  // XP calculation functions
  getXpForLevel,
  getLevelFromXp,
  getXpProgressInLevel,
  getXpToNextLevel,
  // World unlock functions
  getWorldUnlockRequirement,
  isWorldUnlocked,
  isLevelUnlocked,
  getNextUnlockedLevel,
  // Difficulty helpers
  getDifficultyForWorld,
  getGlobalLevel,
  getWorldAndLevel,
} from './constants';

// World and level configuration
export {
  WORLD_CONFIGS,
  getWorldConfig,
  getAllWorldConfigs,
  getLevelConfig,
  getWorldLevels,
  getAllLevelConfigs,
  generateObjectives,
  generateSpecialTiles,
  validateLevelConfig,
  type WorldConfig,
  type ValidationResult,
} from './levelConfig';

// Centralized color system
export {
  getWorldColors,
  getWorldGlow,
  WORLD_COLOR_KEYS,
  type WorldColorPalette,
} from './colors';
