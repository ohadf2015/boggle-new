/**
 * Adventure Achievement Utilities Tests
 *
 * TDD tests for adventure mode achievement definitions and helper functions.
 */

import {
  ADVENTURE_ACHIEVEMENTS,
  getAchievementsByCategory,
  getAchievementCategories,
  isAchievementEarned,
  getAchievementTierInfo,
  type AdventureAchievementId,
  type AdventureAchievementCategory,
} from './adventureAchievementUtils';

describe('ADVENTURE_ACHIEVEMENTS', () => {
  it('has at least 15 achievements', () => {
    expect(Object.keys(ADVENTURE_ACHIEVEMENTS).length).toBeGreaterThanOrEqual(15);
  });

  it('has exactly 17 achievements', () => {
    expect(Object.keys(ADVENTURE_ACHIEVEMENTS).length).toBe(17);
  });

  it('each achievement has required fields', () => {
    Object.values(ADVENTURE_ACHIEVEMENTS).forEach((achievement) => {
      expect(achievement.id).toBeDefined();
      expect(achievement.nameKey).toBeDefined();
      expect(achievement.descriptionKey).toBeDefined();
      expect(achievement.icon).toBeDefined();
      expect(achievement.category).toBeDefined();
      expect(typeof achievement.oneTime).toBe('boolean');
    });
  });

  it('each achievement has valid category', () => {
    const validCategories = ['gameplay', 'bosses', 'progression', 'mastery'];
    Object.values(ADVENTURE_ACHIEVEMENTS).forEach((achievement) => {
      expect(validCategories).toContain(achievement.category);
    });
  });

  it('has achievements in all categories', () => {
    const categories = new Set(
      Object.values(ADVENTURE_ACHIEVEMENTS).map((a) => a.category)
    );
    expect(categories.has('gameplay')).toBe(true);
    expect(categories.has('bosses')).toBe(true);
    expect(categories.has('progression')).toBe(true);
    expect(categories.has('mastery')).toBe(true);
  });

  it('each achievement has unique id matching its key', () => {
    Object.entries(ADVENTURE_ACHIEVEMENTS).forEach(([key, achievement]) => {
      expect(achievement.id).toBe(key);
    });
  });

  it('each achievement has translation keys in correct format', () => {
    Object.values(ADVENTURE_ACHIEVEMENTS).forEach((achievement) => {
      expect(achievement.nameKey).toMatch(/^adventure\.achievements\..+\.name$/);
      expect(achievement.descriptionKey).toMatch(/^adventure\.achievements\..+\.desc$/);
    });
  });

  it('each achievement has an icon (emoji)', () => {
    Object.values(ADVENTURE_ACHIEVEMENTS).forEach((achievement) => {
      expect(achievement.icon.length).toBeGreaterThan(0);
    });
  });
});

describe('getAchievementCategories', () => {
  it('returns all 4 categories', () => {
    const categories = getAchievementCategories();
    expect(categories).toHaveLength(4);
    expect(categories).toContain('gameplay');
    expect(categories).toContain('bosses');
    expect(categories).toContain('progression');
    expect(categories).toContain('mastery');
  });
});

describe('getAchievementsByCategory', () => {
  it('returns gameplay achievements', () => {
    const gameplay = getAchievementsByCategory('gameplay');
    expect(gameplay.length).toBeGreaterThan(0);
    gameplay.forEach((a) => {
      expect(a.category).toBe('gameplay');
    });
  });

  it('returns bosses achievements', () => {
    const bosses = getAchievementsByCategory('bosses');
    expect(bosses.length).toBeGreaterThan(0);
    bosses.forEach((a) => {
      expect(a.category).toBe('bosses');
    });
  });

  it('returns progression achievements', () => {
    const progression = getAchievementsByCategory('progression');
    expect(progression.length).toBeGreaterThan(0);
    progression.forEach((a) => {
      expect(a.category).toBe('progression');
    });
  });

  it('returns mastery achievements', () => {
    const mastery = getAchievementsByCategory('mastery');
    expect(mastery.length).toBeGreaterThan(0);
    mastery.forEach((a) => {
      expect(a.category).toBe('mastery');
    });
  });

  it('all achievements are accounted for across categories', () => {
    const categories = getAchievementCategories();
    let totalCount = 0;
    categories.forEach((cat) => {
      totalCount += getAchievementsByCategory(cat).length;
    });
    expect(totalCount).toBe(Object.keys(ADVENTURE_ACHIEVEMENTS).length);
  });
});

describe('isAchievementEarned', () => {
  it('returns true when count > 0', () => {
    const counts = { FIRST_WORD: 1 };
    expect(isAchievementEarned('FIRST_WORD', counts)).toBe(true);
  });

  it('returns true when count is high', () => {
    const counts = { BOSS_SLAYER: 50 };
    expect(isAchievementEarned('BOSS_SLAYER', counts)).toBe(true);
  });

  it('returns false when count is 0', () => {
    const counts = { FIRST_WORD: 0 };
    expect(isAchievementEarned('FIRST_WORD', counts)).toBe(false);
  });

  it('returns false when achievement not in counts', () => {
    const counts = {};
    expect(isAchievementEarned('FIRST_WORD', counts)).toBe(false);
  });

  it('returns false for undefined achievement', () => {
    const counts = { FIRST_WORD: 1 };
    expect(isAchievementEarned('BOSS_SLAYER', counts)).toBe(false);
  });
});

describe('getAchievementTierInfo', () => {
  describe('one-time achievements', () => {
    it('returns null tier when not earned', () => {
      const counts = {};
      const info = getAchievementTierInfo('FIRST_WORD', counts);
      expect(info.count).toBe(0);
      expect(info.tier).toBeNull();
      expect(info.display).toBeNull();
    });

    it('returns BRONZE tier when earned once', () => {
      const counts = { FIRST_WORD: 1 };
      const info = getAchievementTierInfo('FIRST_WORD', counts);
      expect(info.count).toBe(1);
      expect(info.tier).toBe('BRONZE');
      expect(info.display).not.toBeNull();
      expect(info.display?.name).toBe('BRONZE');
    });

    it('stays at BRONZE tier even with high count', () => {
      const counts = { FIRST_WORD: 100 };
      const info = getAchievementTierInfo('FIRST_WORD', counts);
      expect(info.tier).toBe('BRONZE');
    });
  });

  describe('repeatable achievements', () => {
    it('returns null tier when not earned', () => {
      const counts = {};
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.tier).toBeNull();
    });

    it('returns BRONZE tier at count 1', () => {
      const counts = { BOSS_SLAYER: 1 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.tier).toBe('BRONZE');
    });

    it('returns SILVER tier at count 15', () => {
      const counts = { BOSS_SLAYER: 15 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.tier).toBe('SILVER');
    });

    it('returns GOLD tier at count 75', () => {
      const counts = { BOSS_SLAYER: 75 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.tier).toBe('GOLD');
    });

    it('returns PLATINUM tier at count 300', () => {
      const counts = { BOSS_SLAYER: 300 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.tier).toBe('PLATINUM');
    });

    it('returns progress info for next tier', () => {
      const counts = { BOSS_SLAYER: 10 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.progress.currentTier).toBe('BRONZE');
      expect(info.progress.nextTier).toBe('SILVER');
      expect(info.progress.nextThreshold).toBe(15);
    });
  });

  describe('display info', () => {
    it('includes tier colors', () => {
      const counts = { BOSS_SLAYER: 1 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.display?.colors).toBeDefined();
      expect(info.display?.colors.bg).toBeDefined();
      expect(info.display?.colors.border).toBeDefined();
      expect(info.display?.colors.text).toBeDefined();
    });

    it('includes tier icon', () => {
      const counts = { BOSS_SLAYER: 15 };
      const info = getAchievementTierInfo('BOSS_SLAYER', counts);
      expect(info.display?.icon).toBe('🥈'); // Silver medal
    });
  });
});

describe('achievement definitions content', () => {
  describe('gameplay achievements', () => {
    it('FIRST_WORD is one-time', () => {
      expect(ADVENTURE_ACHIEVEMENTS.FIRST_WORD.oneTime).toBe(true);
    });

    it('WORD_STREAK achievements are repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.WORD_STREAK_5.oneTime).toBe(false);
      expect(ADVENTURE_ACHIEVEMENTS.WORD_STREAK_10.oneTime).toBe(false);
    });

    it('PERFECT_LEVEL is repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.PERFECT_LEVEL.oneTime).toBe(false);
    });
  });

  describe('boss achievements', () => {
    it('BOSS_SLAYER is repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.BOSS_SLAYER.oneTime).toBe(false);
    });

    it('ALL_BOSSES is one-time', () => {
      expect(ADVENTURE_ACHIEVEMENTS.ALL_BOSSES.oneTime).toBe(true);
    });

    it('BOSS_NO_DAMAGE is hidden', () => {
      expect(ADVENTURE_ACHIEVEMENTS.BOSS_NO_DAMAGE.hidden).toBe(true);
    });
  });

  describe('progression achievements', () => {
    it('STAR_COLLECTOR_50 is one-time', () => {
      expect(ADVENTURE_ACHIEVEMENTS.STAR_COLLECTOR_50.oneTime).toBe(true);
    });

    it('WORLD_COMPLETE is repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.WORLD_COMPLETE.oneTime).toBe(false);
    });
  });

  describe('mastery achievements', () => {
    it('SKILL_UNLOCKED is repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.SKILL_UNLOCKED.oneTime).toBe(false);
    });

    it('COMBO_KING is repeatable', () => {
      expect(ADVENTURE_ACHIEVEMENTS.COMBO_KING.oneTime).toBe(false);
    });
  });
});
