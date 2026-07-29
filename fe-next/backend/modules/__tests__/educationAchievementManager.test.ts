/**
 * Education Achievement Manager Tests
 * TDD: RED phase - Write failing tests BEFORE implementation
 *
 * Tests achievement progress calculation and unlock detection:
 * - ACHIEVEMENT_DEFINITIONS constant (18 achievements with categories and tiers)
 * - checkAchievementProgress (calculates progress for all achievements)
 * - calculateNewUnlocks (detects newly unlocked achievements/tiers)
 * - getUnlockPayload (formats unlock data for UI)
 */

import {
  ACHIEVEMENT_DEFINITIONS,
  checkAchievementProgress,
  calculateNewUnlocks,
  getUnlockPayload,
  type AchievementDefinition,
  type AchievementProgress,
  type StudentProgressData,
  type UnlockPayload,
} from '../educationAchievementManager';

describe('educationAchievementManager', () => {
  // ============================================
  // ACHIEVEMENT_DEFINITIONS CONSTANT TESTS
  // ============================================
  describe('ACHIEVEMENT_DEFINITIONS', () => {
    it('should have exactly 18 achievements', () => {
      expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(18);
    });

    it('should have all required properties for each achievement', () => {
      ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
        expect(achievement).toHaveProperty('key');
        expect(achievement).toHaveProperty('category');
        expect(achievement).toHaveProperty('icon');
        expect(achievement).toHaveProperty('isSecret');
        expect(achievement).toHaveProperty('tiers');
        expect(typeof achievement.key).toBe('string');
        expect(typeof achievement.icon).toBe('string');
        expect(typeof achievement.isSecret).toBe('boolean');
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['progress', 'skill', 'consistency', 'exploration'];
      ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
        expect(validCategories).toContain(achievement.category);
      });
    });

    it('should have 4 tiers (bronze, silver, gold, platinum) for each achievement', () => {
      ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
        expect(achievement.tiers).toHaveProperty('bronze');
        expect(achievement.tiers).toHaveProperty('silver');
        expect(achievement.tiers).toHaveProperty('gold');
        expect(achievement.tiers).toHaveProperty('platinum');
        expect(typeof achievement.tiers.bronze).toBe('number');
        expect(typeof achievement.tiers.silver).toBe('number');
        expect(typeof achievement.tiers.gold).toBe('number');
        expect(typeof achievement.tiers.platinum).toBe('number');
      });
    });

    it('should have tiers in ascending order', () => {
      ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
        expect(achievement.tiers.bronze).toBeLessThan(achievement.tiers.silver);
        expect(achievement.tiers.silver).toBeLessThan(achievement.tiers.gold);
        expect(achievement.tiers.gold).toBeLessThanOrEqual(achievement.tiers.platinum);
      });
    });

    it('should have correct category counts', () => {
      const categories = ACHIEVEMENT_DEFINITIONS.reduce((acc, achievement) => {
        acc[achievement.category] = (acc[achievement.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(categories.progress).toBe(5); // 5 progress achievements
      expect(categories.skill).toBe(4); // 4 skill achievements
      expect(categories.consistency).toBe(5); // 5 consistency achievements
      expect(categories.exploration).toBe(4); // 4 exploration achievements
    });

    it('should have exactly 2 secret achievements', () => {
      const secretAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.isSecret);
      expect(secretAchievements).toHaveLength(2);
      expect(secretAchievements.map((a) => a.key)).toContain('streak_champion');
      expect(secretAchievements.map((a) => a.key)).toContain('word_variety');
    });

    it('should have specific achievement keys', () => {
      const keys = ACHIEVEMENT_DEFINITIONS.map((a) => a.key);

      // Progress
      expect(keys).toContain('first_lesson');
      expect(keys).toContain('word_master');
      expect(keys).toContain('level_climber');
      expect(keys).toContain('xp_collector');
      expect(keys).toContain('practice_veteran');

      // Skill
      expect(keys).toContain('speed_demon');
      expect(keys).toContain('perfect_streak');
      expect(keys).toContain('boss_slayer');
      expect(keys).toContain('combo_master');

      // Consistency
      expect(keys).toContain('streak_starter');
      expect(keys).toContain('early_bird');
      expect(keys).toContain('dedicated_learner');
      expect(keys).toContain('weekly_warrior');
      expect(keys).toContain('streak_champion');

      // Exploration
      expect(keys).toContain('mode_explorer');
      expect(keys).toContain('lesson_collector');
      expect(keys).toContain('classroom_contributor');
      expect(keys).toContain('word_variety');
    });
  });

  // ============================================
  // checkAchievementProgress TESTS
  // ============================================
  describe('checkAchievementProgress', () => {
    it('should return progress for all achievements', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);
      expect(progress).toHaveLength(18);
    });

    it('should calculate progress for first_lesson achievement', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 2,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);
      const firstLesson = progress.find((p) => p.key === 'first_lesson');

      expect(firstLesson).toBeDefined();
      expect(firstLesson!.current_tier).toBe('bronze'); // 2 lessons = bronze (threshold 1)
      expect(firstLesson!.progress_value).toBe(2);
      expect(firstLesson!.next_threshold).toBe(3); // Next is silver at 3
      expect(firstLesson!.percent_complete).toBeGreaterThan(0);
    });

    it('should calculate progress for word_master achievement', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 100,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);
      const wordMaster = progress.find((p) => p.key === 'word_master');

      expect(wordMaster).toBeDefined();
      expect(wordMaster!.current_tier).toBe('bronze'); // 100 words = bronze (threshold 50)
      expect(wordMaster!.progress_value).toBe(100);
      expect(wordMaster!.next_threshold).toBe(150); // Next is silver at 150
    });

    it('should return null for secret achievements with no progress', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);

      // Secret achievements should not show progress until unlocked
      const streakChampion = progress.find((p) => p.key === 'streak_champion');
      const wordVariety = progress.find((p) => p.key === 'word_variety');

      expect(streakChampion).toBeDefined();
      expect(wordVariety).toBeDefined();
      expect(streakChampion!.current_tier).toBeNull();
      expect(wordVariety!.current_tier).toBeNull();
    });

    it('should handle zero values correctly', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);

      progress.forEach((p) => {
        // Skip level_climber (currentLevel starts at 1, not 0)
        if (p.key === 'level_climber') return;

        if (!p.isSecret || p.current_tier !== null) {
          expect(p.progress_value).toBe(0);
          expect(p.percent_complete).toBe(0);
        }
      });
    });

    it('should handle max tier reached', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 50, // Platinum tier
        wordsMastered: 2000, // Platinum tier
        currentLevel: 100, // Platinum tier
        totalXp: 100000, // Platinum tier
        practiceSessions: 1000, // Platinum tier
        wordsInGame: 200,
        perfectGames: 100,
        bossesDefeated: 50,
        combosAchieved: 200,
        currentStreak: 50,
        morningPractices: 100,
        daysThisMonth: 31,
        weeksWith5Days: 50,
        longestStreak: 500,
        modesTried: 4,
        lessonsCollected: 100,
        classroomsJoined: 20,
        uniqueWords: 2000,
      };

      const progress = checkAchievementProgress(studentData);
      const firstLesson = progress.find((p) => p.key === 'first_lesson');

      expect(firstLesson!.current_tier).toBe('platinum');
      expect(firstLesson!.next_threshold).toBeNull(); // No next tier
      expect(firstLesson!.percent_complete).toBe(100);
    });

    it('should calculate correct percentage for partial progress', () => {
      const studentData: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 75, // Between bronze (50) and silver (150)
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const progress = checkAchievementProgress(studentData);
      const wordMaster = progress.find((p) => p.key === 'word_master');

      expect(wordMaster!.current_tier).toBe('bronze');
      expect(wordMaster!.progress_value).toBe(75);
      expect(wordMaster!.next_threshold).toBe(150); // Silver

      // Percentage: (75 - 50) / (150 - 50) = 25 / 100 = 25%
      expect(wordMaster!.percent_complete).toBe(25);
    });
  });

  // ============================================
  // calculateNewUnlocks TESTS
  // ============================================
  describe('calculateNewUnlocks', () => {
    it('should return empty array when no new unlocks', () => {
      const before: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: 'bronze',
          progress_value: 2,
          next_threshold: 3,
          percent_complete: 66,
          isSecret: false,
        },
      ];

      const after: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: 'bronze',
          progress_value: 2,
          next_threshold: 3,
          percent_complete: 66,
          isSecret: false,
        },
      ];

      const unlocks = calculateNewUnlocks(before, after);
      expect(unlocks).toHaveLength(0);
    });

    it('should detect first time unlock (null -> bronze)', () => {
      const before: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: null,
          progress_value: 0,
          next_threshold: 1,
          percent_complete: 0,
          isSecret: false,
        },
      ];

      const after: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: 'bronze',
          progress_value: 1,
          next_threshold: 3,
          percent_complete: 0,
          isSecret: false,
        },
      ];

      const unlocks = calculateNewUnlocks(before, after);
      expect(unlocks).toHaveLength(1);
      expect(unlocks[0].achievementKey).toBe('first_lesson');
      expect(unlocks[0].tier).toBe('bronze');
      expect(unlocks[0].isNew).toBe(true);
      expect(unlocks[0].isUpgrade).toBe(false);
    });

    it('should detect tier upgrade (bronze -> silver)', () => {
      const before: AchievementProgress[] = [
        {
          key: 'word_master',
          current_tier: 'bronze',
          progress_value: 100,
          next_threshold: 150,
          percent_complete: 50,
          isSecret: false,
        },
      ];

      const after: AchievementProgress[] = [
        {
          key: 'word_master',
          current_tier: 'silver',
          progress_value: 150,
          next_threshold: 500,
          percent_complete: 0,
          isSecret: false,
        },
      ];

      const unlocks = calculateNewUnlocks(before, after);
      expect(unlocks).toHaveLength(1);
      expect(unlocks[0].achievementKey).toBe('word_master');
      expect(unlocks[0].tier).toBe('silver');
      expect(unlocks[0].isNew).toBe(false);
      expect(unlocks[0].isUpgrade).toBe(true);
    });

    it('should detect multiple unlocks in one session', () => {
      const before: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: null,
          progress_value: 0,
          next_threshold: 1,
          percent_complete: 0,
          isSecret: false,
        },
        {
          key: 'word_master',
          current_tier: 'bronze',
          progress_value: 100,
          next_threshold: 150,
          percent_complete: 50,
          isSecret: false,
        },
      ];

      const after: AchievementProgress[] = [
        {
          key: 'first_lesson',
          current_tier: 'bronze',
          progress_value: 1,
          next_threshold: 3,
          percent_complete: 0,
          isSecret: false,
        },
        {
          key: 'word_master',
          current_tier: 'silver',
          progress_value: 150,
          next_threshold: 500,
          percent_complete: 0,
          isSecret: false,
        },
      ];

      const unlocks = calculateNewUnlocks(before, after);
      expect(unlocks).toHaveLength(2);
      expect(unlocks.map((u) => u.achievementKey)).toContain('first_lesson');
      expect(unlocks.map((u) => u.achievementKey)).toContain('word_master');
    });

    it('should handle secret achievement unlock', () => {
      const before: AchievementProgress[] = [
        {
          key: 'streak_champion',
          current_tier: null,
          progress_value: 0,
          next_threshold: null,
          percent_complete: 0,
          isSecret: true,
        },
      ];

      const after: AchievementProgress[] = [
        {
          key: 'streak_champion',
          current_tier: 'bronze',
          progress_value: 7,
          next_threshold: 30,
          percent_complete: 0,
          isSecret: true,
        },
      ];

      const unlocks = calculateNewUnlocks(before, after);
      expect(unlocks).toHaveLength(1);
      expect(unlocks[0].achievementKey).toBe('streak_champion');
      expect(unlocks[0].tier).toBe('bronze');
      expect(unlocks[0].isNew).toBe(true);
    });
  });

  // ============================================
  // getUnlockPayload TESTS
  // ============================================
  describe('getUnlockPayload', () => {
    it('should create payload for first unlock (isNew = true)', () => {
      const payload = getUnlockPayload('first_lesson', 'bronze', true);

      expect(payload.achievementKey).toBe('first_lesson');
      expect(payload.tier).toBe('bronze');
      expect(payload.icon).toBeDefined();
      expect(payload.isNew).toBe(true);
      expect(payload.isUpgrade).toBe(false);
    });

    it('should create payload for tier upgrade (isUpgrade = true)', () => {
      const payload = getUnlockPayload('word_master', 'silver', false);

      expect(payload.achievementKey).toBe('word_master');
      expect(payload.tier).toBe('silver');
      expect(payload.icon).toBeDefined();
      expect(payload.isNew).toBe(false);
      expect(payload.isUpgrade).toBe(true);
    });

    it('should include correct icon from ACHIEVEMENT_DEFINITIONS', () => {
      const payload = getUnlockPayload('first_lesson', 'bronze', true);
      const achievement = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === 'first_lesson');

      expect(payload.icon).toBe(achievement!.icon);
    });
  });
});
