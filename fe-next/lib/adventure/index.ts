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
  OBJECTIVE_TRANSLATION_KEYS,
  // Grid and timer configuration
  GRID_SIZES,
  TIMER_DURATIONS,
  getGridSize,
  getTimerDuration,
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
  applyGemDetectorBoost,
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

// Grid generation for adventure levels
export {
  generateAdventureGrid,
  getLevelSeed,
  seedThemedLetters,
  VOWELS,
  COMMON_CONSONANTS,
  RARE_CONSONANTS,
} from './gridGenerator';

// Themed word pools for adventure worlds
export {
  getThemedWords,
  isThemedWord,
  getThemeBonusMultiplier,
  getThemeDisplayKey,
  WORLD_THEMED_WORDS,
  type WorldThemeConfig,
} from './themedWords';

// Upgrade visual effects
export {
  getUpgradeVisualEffect,
  getBoardVisualUpgrades,
  getUpgradeIntensity,
  getActiveUpgradeIndicators,
  type UpgradeVisualEffect,
} from './upgradeEffects';

// Entry timing constants (DEBT-01 optimization)
export {
  OPTIMIZED_TIMING,
  CASCADE_STAGGER_MS,
  CASCADE_SETTLE_MS,
  CASCADE_SPRING,
  OBJECTIVES_STAGGER_MS,
  OBJECTIVES_DURATION_MS,
  OBJECTIVES_SPRING,
  TITLE_BURST_MS,
  TITLE_HOLD_MS,
  TITLE_FADE_MS,
  TITLE_TOTAL_MS,
} from './entryTiming';

// Archetype mastery system
export {
  ARCHETYPE_MASTERY_THRESHOLDS,
  ARCHETYPE_MASTERY_BONUSES,
  getMasteryTier,
  calculateArchetypeMastery,
  getMasteryBonusesForArchetype,
  applyMasteryBonuses,
} from './archetypeMastery';

// Rune collection system
export {
  RUNE_CATALOG,
  RUNE_FORGE_COSTS,
  MAX_EQUIPPED_RUNES,
  getRuneById,
  canForgeRune,
  forgeRune,
  equipRune,
  unequipRune,
  computeRuneEffects,
  type RuneDefinition,
  type RuneRarity,
  type RuneEffectChannel,
  type RuneEffects,
} from './runeCatalog';

// World mastery system
export {
  calculateMasteryCriteria,
  calculateMasteryTier,
  calculateWorldMastery,
} from './mastery';

// Power growth system
export {
  getMasteryAura,
  getComboCeiling,
  getPowerRating,
} from './powerGrowth';

// Story beats
export {
  getStoryBeat,
  STORY_BEATS,
  type StoryBeat,
} from './storyConfig';

// Adventure streak system
export {
  updateStreak,
  getStreakMultiplier,
  type AdventureStreakState,
} from './adventureStreak';

// Weekly modifiers
export {
  getWeeklyModifiers,
  applyModifiers,
  MODIFIER_POOL,
  type WeeklyModifier,
  type ModifierEffects,
  type ModifiableConfig,
} from './weeklyModifiers';

// Endless mode
export {
  ENDLESS_MODE_CONFIG,
  getEndlessDifficulty,
  generateEndlessFloor,
  type EndlessDifficulty,
} from './endlessMode';

// Boss rush
export {
  createBossRushState,
  advanceBossRush,
  getBossRushReward,
  type BossRushState,
  type BossRushReward,
} from './bossRush';

