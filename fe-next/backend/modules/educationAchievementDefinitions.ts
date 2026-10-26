/** The 18 education achievements and their Bronze/Silver/Gold/Platinum thresholds. */

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
