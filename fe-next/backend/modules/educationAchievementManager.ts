/**
 * Education Achievement Manager
 * Handles achievement progress calculation and unlock detection for education mode
 *
 * Design: 18 achievements across 4 categories with 4-tier progression
 * - Progress: Milestone-based (lessons, XP, words mastered)
 * - Skill: Performance-based (speed, accuracy, bosses)
 * - Consistency: Streak-based (daily practice, streaks)
 * - Exploration: Discovery-based (modes, lessons, classrooms)
 *
 * Each achievement has Bronze/Silver/Gold/Platinum tiers
 * 2 secret achievements hide progress until unlocked
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AchievementDefinition {
  key: string;
  category: 'progress' | 'skill' | 'consistency' | 'exploration';
  icon: string;
  isSecret: boolean;
  tiers: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

export interface StudentProgressData {
  // Progress milestones
  lessonsCompleted: number;
  wordsMastered: number;
  currentLevel: number;
  totalXp: number;
  practiceSessions: number;

  // Skill metrics
  wordsInGame: number; // Max words in single game (speed_demon)
  perfectGames: number; // Games with 100% accuracy
  bossesDefeated: number;
  combosAchieved: number;

  // Consistency metrics
  currentStreak: number;
  morningPractices: number; // Before 9am
  daysThisMonth: number; // Days practiced this month
  weeksWith5Days: number; // Weeks with 5+ practice days
  longestStreak: number;

  // Exploration metrics
  modesTried: number; // Unique practice modes
  lessonsCollected: number; // Different lessons completed
  classroomsJoined: number;
  uniqueWords: number; // Unique vocabulary words found
}

export interface AchievementProgress {
  key: string;
  current_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  progress_value: number;
  next_threshold: number | null;
  percent_complete: number;
  isSecret: boolean;
}

export interface UnlockPayload {
  achievementKey: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  isNew: boolean; // First time unlock (null -> bronze)
  isUpgrade: boolean; // Tier upgrade (bronze -> silver, etc.)
}

// ============================================
// ACHIEVEMENT DEFINITIONS (18 total)
// ============================================

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ===== PROGRESS MILESTONES (5) =====
  {
    key: 'first_lesson',
    category: 'progress',
    icon: '📚',
    isSecret: false,
    tiers: {
      bronze: 1,
      silver: 3,
      gold: 10,
      platinum: 25,
    },
  },
  {
    key: 'word_master',
    category: 'progress',
    icon: '🎓',
    isSecret: false,
    tiers: {
      bronze: 50,
      silver: 150,
      gold: 500,
      platinum: 1000,
    },
  },
  {
    key: 'level_climber',
    category: 'progress',
    icon: '⬆️',
    isSecret: false,
    tiers: {
      bronze: 5,
      silver: 10,
      gold: 25,
      platinum: 50,
    },
  },
  {
    key: 'xp_collector',
    category: 'progress',
    icon: '💎',
    isSecret: false,
    tiers: {
      bronze: 500,
      silver: 2000,
      gold: 10000,
      platinum: 50000,
    },
  },
  {
    key: 'practice_veteran',
    category: 'progress',
    icon: '🎖️',
    isSecret: false,
    tiers: {
      bronze: 10,
      silver: 50,
      gold: 200,
      platinum: 500,
    },
  },

  // ===== SKILL-BASED (4) =====
  {
    key: 'speed_demon',
    category: 'skill',
    icon: '⚡',
    isSecret: false,
    tiers: {
      bronze: 10,
      silver: 25,
      gold: 50,
      platinum: 100,
    },
  },
  {
    key: 'perfect_streak',
    category: 'skill',
    icon: '✨',
    isSecret: false,
    tiers: {
      bronze: 5,
      silver: 10,
      gold: 25,
      platinum: 50,
    },
  },
  {
    key: 'boss_slayer',
    category: 'skill',
    icon: '🗡️',
    isSecret: false,
    tiers: {
      bronze: 1,
      silver: 5,
      gold: 15,
      platinum: 30,
    },
  },
  {
    key: 'combo_master',
    category: 'skill',
    icon: '🔥',
    isSecret: false,
    tiers: {
      bronze: 5,
      silver: 15,
      gold: 50,
      platinum: 100,
    },
  },

  // ===== CONSISTENCY (5) =====
  {
    key: 'streak_starter',
    category: 'consistency',
    icon: '🔥',
    isSecret: false,
    tiers: {
      bronze: 3,
      silver: 7,
      gold: 14,
      platinum: 30,
    },
  },
  {
    key: 'early_bird',
    category: 'consistency',
    icon: '🌅',
    isSecret: false,
    tiers: {
      bronze: 5,
      silver: 15,
      gold: 30,
      platinum: 60,
    },
  },
  {
    key: 'dedicated_learner',
    category: 'consistency',
    icon: '📅',
    isSecret: false,
    tiers: {
      bronze: 5,
      silver: 10,
      gold: 20,
      platinum: 30,
    },
  },
  {
    key: 'weekly_warrior',
    category: 'consistency',
    icon: '⚔️',
    isSecret: false,
    tiers: {
      bronze: 1,
      silver: 4,
      gold: 12,
      platinum: 26,
    },
  },
  {
    key: 'streak_champion',
    category: 'consistency',
    icon: '👑',
    isSecret: true, // SECRET
    tiers: {
      bronze: 7,
      silver: 30,
      gold: 90,
      platinum: 365,
    },
  },

  // ===== EXPLORATION (4) =====
  {
    key: 'mode_explorer',
    category: 'exploration',
    icon: '🧭',
    isSecret: false,
    tiers: {
      bronze: 2,
      silver: 3,
      gold: 4,
      platinum: 7,
    },
  },
  {
    key: 'lesson_collector',
    category: 'exploration',
    icon: '📖',
    isSecret: false,
    tiers: {
      bronze: 3,
      silver: 10,
      gold: 25,
      platinum: 50,
    },
  },
  {
    key: 'classroom_contributor',
    category: 'exploration',
    icon: '👥',
    isSecret: false,
    tiers: {
      bronze: 1,
      silver: 3,
      gold: 5,
      platinum: 10,
    },
  },
  {
    key: 'word_variety',
    category: 'exploration',
    icon: '🌈',
    isSecret: true, // SECRET
    tiers: {
      bronze: 50,
      silver: 200,
      gold: 500,
      platinum: 1000,
    },
  },
];

// ============================================
// PROGRESS CALCULATION FUNCTIONS
// ============================================

/**
 * Map student data to achievement progress value
 * Each achievement tracks a specific metric from StudentProgressData
 */
function getProgressValue(key: string, data: StudentProgressData): number {
  const progressMap: Record<string, number> = {
    // Progress
    first_lesson: data.lessonsCompleted,
    word_master: data.wordsMastered,
    level_climber: data.currentLevel,
    xp_collector: data.totalXp,
    practice_veteran: data.practiceSessions,

    // Skill
    speed_demon: data.wordsInGame,
    perfect_streak: data.perfectGames,
    boss_slayer: data.bossesDefeated,
    combo_master: data.combosAchieved,

    // Consistency
    streak_starter: data.currentStreak,
    early_bird: data.morningPractices,
    dedicated_learner: data.daysThisMonth,
    weekly_warrior: data.weeksWith5Days,
    streak_champion: data.longestStreak,

    // Exploration
    mode_explorer: data.modesTried,
    lesson_collector: data.lessonsCollected,
    classroom_contributor: data.classroomsJoined,
    word_variety: data.uniqueWords,
  };

  return progressMap[key] || 0;
}

/**
 * Calculate current tier based on progress value
 * Returns tier name or null if not unlocked
 */
function calculateTier(
  progressValue: number,
  tiers: AchievementDefinition['tiers'],
  isSecret: boolean
): 'bronze' | 'silver' | 'gold' | 'platinum' | null {
  // Secret achievements hide tier until bronze unlocked
  if (isSecret && progressValue < tiers.bronze) {
    return null;
  }

  if (progressValue >= tiers.platinum) return 'platinum';
  if (progressValue >= tiers.gold) return 'gold';
  if (progressValue >= tiers.silver) return 'silver';
  if (progressValue >= tiers.bronze) return 'bronze';

  return null;
}

/**
 * Calculate next tier threshold
 * Returns null if at max tier (platinum)
 */
function getNextThreshold(
  currentTier: AchievementProgress['current_tier'],
  tiers: AchievementDefinition['tiers']
): number | null {
  if (currentTier === 'platinum') return null;
  if (currentTier === 'gold') return tiers.platinum;
  if (currentTier === 'silver') return tiers.gold;
  if (currentTier === 'bronze') return tiers.silver;

  // No tier yet - next is bronze
  return tiers.bronze;
}

/**
 * Calculate percentage toward next tier
 * Returns 100 if at max tier, 0 if no progress
 */
function calculatePercentComplete(
  progressValue: number,
  currentTier: AchievementProgress['current_tier'],
  nextThreshold: number | null,
  tiers: AchievementDefinition['tiers']
): number {
  // Max tier reached
  if (currentTier === 'platinum') return 100;

  // No progress yet
  if (nextThreshold === null || progressValue === 0) return 0;

  // Determine current tier's threshold (base for percentage calculation)
  let currentThreshold = 0;
  if (currentTier === 'gold') currentThreshold = tiers.gold;
  else if (currentTier === 'silver') currentThreshold = tiers.silver;
  else if (currentTier === 'bronze') currentThreshold = tiers.bronze;

  // Calculate percentage: (progress - current) / (next - current) * 100
  const range = nextThreshold - currentThreshold;
  const progressInRange = progressValue - currentThreshold;

  return Math.min(100, Math.round((progressInRange / range) * 100));
}

/**
 * Calculate achievement progress for all achievements
 *
 * @param studentData - Student progress metrics
 * @returns Array of achievement progress for all 18 achievements
 */
export function checkAchievementProgress(studentData: StudentProgressData): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((achievement) => {
    const progressValue = getProgressValue(achievement.key, studentData);
    const currentTier = calculateTier(progressValue, achievement.tiers, achievement.isSecret);
    const nextThreshold = getNextThreshold(currentTier, achievement.tiers);
    const percentComplete = calculatePercentComplete(
      progressValue,
      currentTier,
      nextThreshold,
      achievement.tiers
    );

    return {
      key: achievement.key,
      current_tier: currentTier,
      progress_value: progressValue,
      next_threshold: nextThreshold,
      percent_complete: percentComplete,
      isSecret: achievement.isSecret,
    };
  });
}

// ============================================
// UNLOCK DETECTION FUNCTIONS
// ============================================

/**
 * Calculate newly unlocked achievements by comparing before/after progress
 *
 * @param before - Progress before action
 * @param after - Progress after action
 * @returns Array of newly unlocked achievements with payloads
 */
export function calculateNewUnlocks(
  before: AchievementProgress[],
  after: AchievementProgress[]
): UnlockPayload[] {
  const unlocks: UnlockPayload[] = [];

  // Compare each achievement
  for (let i = 0; i < after.length; i++) {
    const beforeProgress = before[i];
    const afterProgress = after[i];

    // No change in tier
    if (beforeProgress.current_tier === afterProgress.current_tier) {
      continue;
    }

    // New unlock detected
    if (afterProgress.current_tier !== null) {
      const isNew = beforeProgress.current_tier === null;
      const payload = getUnlockPayload(afterProgress.key, afterProgress.current_tier, isNew);
      unlocks.push(payload);
    }
  }

  return unlocks;
}

/**
 * Create unlock payload for UI display
 *
 * @param key - Achievement key
 * @param tier - Tier unlocked
 * @param isNew - True if first unlock (null -> bronze), false if upgrade
 * @returns Unlock payload for modal/notification
 */
export function getUnlockPayload(
  key: string,
  tier: 'bronze' | 'silver' | 'gold' | 'platinum',
  isNew: boolean
): UnlockPayload {
  const achievement = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === key);

  if (!achievement) {
    throw new Error(`Achievement not found: ${key}`);
  }

  return {
    achievementKey: key,
    tier,
    icon: achievement.icon,
    isNew,
    isUpgrade: !isNew,
  };
}

