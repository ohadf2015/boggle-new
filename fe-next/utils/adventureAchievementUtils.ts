/**
 * Adventure Achievement Utilities
 *
 * Defines adventure-specific achievements and provides helper functions.
 * Uses the existing tier system from achievementTiers.ts for progression.
 */

import { calculateTier, getTierProgress, getTierDisplay, type TierName } from './achievementTiers';

// ==============================================
// ACHIEVEMENT DEFINITIONS
// ==============================================

/**
 * Adventure achievement categories
 */
export type AdventureAchievementCategory =
  | 'gameplay'    // Word-finding achievements
  | 'bosses'      // Boss battle achievements
  | 'progression' // Level/world completion
  | 'mastery';    // Skill and strategy achievements

/**
 * Adventure achievement definition
 */
export interface AdventureAchievementDef {
  /** Unique achievement ID */
  id: AdventureAchievementId;
  /** Translation key for name */
  nameKey: string;
  /** Translation key for description */
  descriptionKey: string;
  /** Achievement category */
  category: AdventureAchievementCategory;
  /** Icon (emoji or icon name) */
  icon: string;
  /** Whether this is a one-time achievement (vs repeatable/tiered) */
  oneTime: boolean;
  /** Hidden until first earned */
  hidden?: boolean;
}

/**
 * All adventure achievement IDs
 */
export type AdventureAchievementId =
  // Gameplay achievements
  | 'FIRST_WORD'
  | 'WORD_STREAK_5'
  | 'WORD_STREAK_10'
  | 'LONG_WORD_6'
  | 'LONG_WORD_8'
  | 'PERFECT_LEVEL'
  // Boss achievements
  | 'BOSS_SLAYER'
  | 'BOSS_SPEEDRUN'
  | 'BOSS_NO_DAMAGE'
  | 'ALL_BOSSES'
  // Progression achievements
  | 'WORLD_COMPLETE'
  | 'STAR_COLLECTOR_50'
  | 'STAR_COLLECTOR_100'
  | 'LEVEL_MASTER'
  // Mastery achievements
  | 'SKILL_UNLOCKED'
  | 'SKILL_PATH_COMPLETE'
  | 'COMBO_KING';

/**
 * Adventure achievements catalog
 */
export const ADVENTURE_ACHIEVEMENTS: Record<AdventureAchievementId, AdventureAchievementDef> = {
  // Gameplay
  FIRST_WORD: {
    id: 'FIRST_WORD',
    nameKey: 'adventure.achievements.firstWord.name',
    descriptionKey: 'adventure.achievements.firstWord.desc',
    category: 'gameplay',
    icon: '📝',
    oneTime: true,
  },
  WORD_STREAK_5: {
    id: 'WORD_STREAK_5',
    nameKey: 'adventure.achievements.wordStreak5.name',
    descriptionKey: 'adventure.achievements.wordStreak5.desc',
    category: 'gameplay',
    icon: '🔥',
    oneTime: false,
  },
  WORD_STREAK_10: {
    id: 'WORD_STREAK_10',
    nameKey: 'adventure.achievements.wordStreak10.name',
    descriptionKey: 'adventure.achievements.wordStreak10.desc',
    category: 'gameplay',
    icon: '🌟',
    oneTime: false,
  },
  LONG_WORD_6: {
    id: 'LONG_WORD_6',
    nameKey: 'adventure.achievements.longWord6.name',
    descriptionKey: 'adventure.achievements.longWord6.desc',
    category: 'gameplay',
    icon: '📚',
    oneTime: false,
  },
  LONG_WORD_8: {
    id: 'LONG_WORD_8',
    nameKey: 'adventure.achievements.longWord8.name',
    descriptionKey: 'adventure.achievements.longWord8.desc',
    category: 'gameplay',
    icon: '🏆',
    oneTime: false,
  },
  PERFECT_LEVEL: {
    id: 'PERFECT_LEVEL',
    nameKey: 'adventure.achievements.perfectLevel.name',
    descriptionKey: 'adventure.achievements.perfectLevel.desc',
    category: 'gameplay',
    icon: '⭐',
    oneTime: false,
  },

  // Bosses
  BOSS_SLAYER: {
    id: 'BOSS_SLAYER',
    nameKey: 'adventure.achievements.bossSlayer.name',
    descriptionKey: 'adventure.achievements.bossSlayer.desc',
    category: 'bosses',
    icon: '⚔️',
    oneTime: false,
  },
  BOSS_SPEEDRUN: {
    id: 'BOSS_SPEEDRUN',
    nameKey: 'adventure.achievements.bossSpeedrun.name',
    descriptionKey: 'adventure.achievements.bossSpeedrun.desc',
    category: 'bosses',
    icon: '⏱️',
    oneTime: false,
  },
  BOSS_NO_DAMAGE: {
    id: 'BOSS_NO_DAMAGE',
    nameKey: 'adventure.achievements.bossNoDamage.name',
    descriptionKey: 'adventure.achievements.bossNoDamage.desc',
    category: 'bosses',
    icon: '🛡️',
    oneTime: false,
    hidden: true,
  },
  ALL_BOSSES: {
    id: 'ALL_BOSSES',
    nameKey: 'adventure.achievements.allBosses.name',
    descriptionKey: 'adventure.achievements.allBosses.desc',
    category: 'bosses',
    icon: '👑',
    oneTime: true,
  },

  // Progression
  WORLD_COMPLETE: {
    id: 'WORLD_COMPLETE',
    nameKey: 'adventure.achievements.worldComplete.name',
    descriptionKey: 'adventure.achievements.worldComplete.desc',
    category: 'progression',
    icon: '🌍',
    oneTime: false,
  },
  STAR_COLLECTOR_50: {
    id: 'STAR_COLLECTOR_50',
    nameKey: 'adventure.achievements.starCollector50.name',
    descriptionKey: 'adventure.achievements.starCollector50.desc',
    category: 'progression',
    icon: '✨',
    oneTime: true,
  },
  STAR_COLLECTOR_100: {
    id: 'STAR_COLLECTOR_100',
    nameKey: 'adventure.achievements.starCollector100.name',
    descriptionKey: 'adventure.achievements.starCollector100.desc',
    category: 'progression',
    icon: '💫',
    oneTime: true,
  },
  LEVEL_MASTER: {
    id: 'LEVEL_MASTER',
    nameKey: 'adventure.achievements.levelMaster.name',
    descriptionKey: 'adventure.achievements.levelMaster.desc',
    category: 'progression',
    icon: '🎓',
    oneTime: false,
  },

  // Mastery
  SKILL_UNLOCKED: {
    id: 'SKILL_UNLOCKED',
    nameKey: 'adventure.achievements.skillUnlocked.name',
    descriptionKey: 'adventure.achievements.skillUnlocked.desc',
    category: 'mastery',
    icon: '🔓',
    oneTime: false,
  },
  SKILL_PATH_COMPLETE: {
    id: 'SKILL_PATH_COMPLETE',
    nameKey: 'adventure.achievements.skillPathComplete.name',
    descriptionKey: 'adventure.achievements.skillPathComplete.desc',
    category: 'mastery',
    icon: '🌳',
    oneTime: false,
  },
  COMBO_KING: {
    id: 'COMBO_KING',
    nameKey: 'adventure.achievements.comboKing.name',
    descriptionKey: 'adventure.achievements.comboKing.desc',
    category: 'mastery',
    icon: '👑',
    oneTime: false,
  },
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: AdventureAchievementCategory
): AdventureAchievementDef[] {
  return Object.values(ADVENTURE_ACHIEVEMENTS).filter(
    (a) => a.category === category
  );
}

/**
 * Get all achievement categories
 */
export function getAchievementCategories(): AdventureAchievementCategory[] {
  return ['gameplay', 'bosses', 'progression', 'mastery'];
}

/**
 * Check if an achievement is earned (count > 0)
 */
export function isAchievementEarned(
  id: AdventureAchievementId,
  counts: Record<string, number>
): boolean {
  return (counts[id] || 0) > 0;
}

/**
 * Get achievement tier info using existing tier system
 */
export function getAchievementTierInfo(
  id: AdventureAchievementId,
  counts: Record<string, number>
) {
  const count = counts[id] || 0;
  const achievement = ADVENTURE_ACHIEVEMENTS[id];

  // One-time achievements don't have tiers
  if (achievement?.oneTime) {
    return {
      count,
      tier: count > 0 ? ('BRONZE' as TierName) : null,
      progress: getTierProgress(count),
      display: count > 0 ? getTierDisplay('BRONZE') : null,
    };
  }

  return {
    count,
    tier: calculateTier(count),
    progress: getTierProgress(count),
    display: getTierDisplay(calculateTier(count)),
  };
}
