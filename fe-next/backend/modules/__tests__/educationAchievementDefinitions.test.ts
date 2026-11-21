import { ACHIEVEMENT_DEFINITIONS } from '../educationAchievementDefinitions';

describe('educationAchievementDefinitions', () => {
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
});
