/**
 * Adventure XP Utilities - Test Suite
 * Tests for adventure-specific XP calculation, level derivation, and progression
 */

import {
  getXpForLevel,
  getLevelFromXp,
  getXpProgress,
  checkLevelUp,
  calculateAdventureXp,
  AdventureXpProgress,
  LevelUpCheck,
  AdventureXpConfig,
} from '../../../shared/utils/adventureXpUtils';

describe('adventureXpUtils', () => {
  describe('getXpForLevel', () => {
    it('should return 0 XP for level 1', () => {
      expect(getXpForLevel(1)).toBe(0);
    });

    it('should return appropriate XP for level 2 (early game)', () => {
      const xp = getXpForLevel(2);
      expect(xp).toBeGreaterThan(0);
      expect(xp).toBeLessThan(200); // Early levels should be fast
    });

    it('should return appropriate XP for level 10 (mid game)', () => {
      const xp = getXpForLevel(10);
      expect(xp).toBeGreaterThan(500);
      expect(xp).toBeLessThan(2000);
    });

    it('should return appropriate XP for level 30 (late game)', () => {
      const xp = getXpForLevel(30);
      expect(xp).toBeGreaterThan(3000);
      expect(xp).toBeLessThan(15000);
    });

    it('should return appropriate XP for level 50 (max level)', () => {
      const xp = getXpForLevel(50);
      expect(xp).toBeGreaterThan(15000);
    });

    it('should handle level 0 as level 1', () => {
      expect(getXpForLevel(0)).toBe(0);
    });

    it('should handle negative levels as level 1', () => {
      expect(getXpForLevel(-5)).toBe(0);
    });

    it('should produce exponential curve (level 10 requires ~10x more XP than level 2)', () => {
      const xpLevel2 = getXpForLevel(2);
      const xpLevel10 = getXpForLevel(10);
      const ratio = xpLevel10 / xpLevel2;
      expect(ratio).toBeGreaterThan(8); // At least 8x
      expect(ratio).toBeLessThan(15); // But not too steep
    });
  });

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(getLevelFromXp(-100)).toBe(1);
    });

    it('should return level 2 for XP just above level 2 threshold', () => {
      const xpLevel2 = getXpForLevel(2);
      expect(getLevelFromXp(xpLevel2 + 10)).toBe(2);
    });

    it('should return level 1 for XP just below level 2 threshold', () => {
      const xpLevel2 = getXpForLevel(2);
      expect(getLevelFromXp(xpLevel2 - 1)).toBe(1);
    });

    it('should return level 10 for appropriate mid-game XP', () => {
      const xpLevel10 = getXpForLevel(10);
      expect(getLevelFromXp(xpLevel10)).toBe(10);
    });

    it('should return level 30 for appropriate late-game XP', () => {
      const xpLevel30 = getXpForLevel(30);
      expect(getLevelFromXp(xpLevel30)).toBe(30);
    });

    it('should return level 50 for max level XP', () => {
      const xpLevel50 = getXpForLevel(50);
      expect(getLevelFromXp(xpLevel50)).toBe(50);
    });

    it('should cap at max level (50) for extremely high XP', () => {
      const veryHighXp = 10000000;
      expect(getLevelFromXp(veryHighXp)).toBe(50);
    });

    it('should be inverse of getXpForLevel', () => {
      for (let level = 1; level <= 50; level += 5) {
        const xp = getXpForLevel(level);
        expect(getLevelFromXp(xp)).toBe(level);
      }
    });
  });

  describe('getXpProgress', () => {
    it('should return correct progress for level 1 with 0 XP', () => {
      const progress = getXpProgress(0);
      expect(progress.currentLevel).toBe(1);
      expect(progress.xpInCurrentLevel).toBe(0);
      expect(progress.progressPercent).toBe(0);
      expect(progress.isMaxLevel).toBe(false);
    });

    it('should return correct progress for mid-level XP', () => {
      const xpLevel5 = getXpForLevel(5);
      const xpLevel6 = getXpForLevel(6);
      const midXp = xpLevel5 + Math.floor((xpLevel6 - xpLevel5) / 2);

      const progress = getXpProgress(midXp);
      expect(progress.currentLevel).toBe(5);
      expect(progress.progressPercent).toBeGreaterThanOrEqual(45);
      expect(progress.progressPercent).toBeLessThanOrEqual(55);
      expect(progress.isMaxLevel).toBe(false);
    });

    it('should return 100% progress for max level', () => {
      const xpLevel50 = getXpForLevel(50);
      const progress = getXpProgress(xpLevel50 + 1000);
      expect(progress.currentLevel).toBe(50);
      expect(progress.progressPercent).toBe(100);
      expect(progress.isMaxLevel).toBe(true);
    });

    it('should calculate xpNeededForNextLevel correctly', () => {
      const xpLevel5 = getXpForLevel(5);
      const xpLevel6 = getXpForLevel(6);
      const progress = getXpProgress(xpLevel5 + 50);

      expect(progress.xpNeededForNextLevel).toBe(xpLevel6 - xpLevel5);
      expect(progress.xpInCurrentLevel).toBe(50);
    });

    it('should return correct structure with all required fields', () => {
      const progress = getXpProgress(500);
      expect(progress).toHaveProperty('currentLevel');
      expect(progress).toHaveProperty('progressPercent');
      expect(progress).toHaveProperty('xpInCurrentLevel');
      expect(progress).toHaveProperty('xpNeededForNextLevel');
      expect(progress).toHaveProperty('isMaxLevel');
    });
  });

  describe('checkLevelUp', () => {
    it('should return no level up when levels are equal', () => {
      const result = checkLevelUp(5, 5);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBeUndefined();
    });

    it('should return no level up when new level is lower', () => {
      const result = checkLevelUp(10, 5);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBeUndefined();
    });

    it('should detect single level up', () => {
      const result = checkLevelUp(5, 6);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(6);
    });

    it('should detect multiple level ups', () => {
      const result = checkLevelUp(5, 10);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(10);
    });

    it('should handle level up from 1 to 2', () => {
      const result = checkLevelUp(1, 2);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    it('should handle level up to max level', () => {
      const result = checkLevelUp(49, 50);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(50);
    });
  });

  describe('calculateAdventureXp', () => {
    it('should calculate XP for easy difficulty', () => {
      const xp = calculateAdventureXp('easy', 1, {});
      expect(xp).toBeGreaterThan(0);
      expect(xp).toBeLessThan(100);
    });

    it('should calculate XP for medium difficulty', () => {
      const xp = calculateAdventureXp('medium', 1, {});
      expect(xp).toBeGreaterThan(calculateAdventureXp('easy', 1, {}));
    });

    it('should calculate XP for hard difficulty', () => {
      const xp = calculateAdventureXp('hard', 1, {});
      expect(xp).toBeGreaterThan(calculateAdventureXp('medium', 1, {}));
    });

    it('should scale XP with combo multiplier', () => {
      const xpCombo1 = calculateAdventureXp('medium', 1, {});
      const xpCombo3 = calculateAdventureXp('medium', 3, {});
      expect(xpCombo3).toBeGreaterThan(xpCombo1);
    });

    it('should apply perfect clear bonus', () => {
      const xpNormal = calculateAdventureXp('medium', 1, {});
      const xpPerfect = calculateAdventureXp('medium', 1, { perfectClear: true });
      expect(xpPerfect).toBeGreaterThan(xpNormal);
    });

    it('should apply time bonus', () => {
      const xpNormal = calculateAdventureXp('medium', 1, {});
      const xpTimeBonus = calculateAdventureXp('medium', 1, { timeBonus: 0.5 });
      expect(xpTimeBonus).toBeGreaterThan(xpNormal);
    });

    it('should apply multiple bonuses cumulatively', () => {
      const xpNormal = calculateAdventureXp('medium', 1, {});
      const xpAllBonuses = calculateAdventureXp('medium', 3, {
        perfectClear: true,
        timeBonus: 0.5,
      });
      expect(xpAllBonuses).toBeGreaterThan(xpNormal * 2);
    });

    it('should handle negative combo as 1', () => {
      const xpNegative = calculateAdventureXp('medium', -5, {});
      const xpOne = calculateAdventureXp('medium', 1, {});
      expect(xpNegative).toBe(xpOne);
    });

    it('should handle zero combo as 1', () => {
      const xpZero = calculateAdventureXp('medium', 0, {});
      const xpOne = calculateAdventureXp('medium', 1, {});
      expect(xpZero).toBe(xpOne);
    });
  });

  describe('Integration - Level progression simulation', () => {
    it('should simulate realistic level progression from 1 to 10', () => {
      let totalXp = 0;
      let currentLevel = 1;
      const xpPerGame = 50; // Simulating average XP per game

      // Simulate playing games until level 10
      while (currentLevel < 10) {
        totalXp += xpPerGame;
        const newLevel = getLevelFromXp(totalXp);

        if (newLevel > currentLevel) {
          const levelUp = checkLevelUp(currentLevel, newLevel);
          expect(levelUp.leveledUp).toBe(true);
          currentLevel = newLevel;
        }
      }

      expect(currentLevel).toBe(10);
      expect(totalXp).toBeGreaterThan(500);
      expect(totalXp).toBeLessThan(3000);
    });

    it('should maintain consistent XP curve across all levels', () => {
      for (let level = 2; level < 50; level++) {
        const currentLevelXp = getXpForLevel(level);
        const nextLevelXp = getXpForLevel(level + 1);

        // Each level should require more XP than the previous
        expect(nextLevelXp).toBeGreaterThan(currentLevelXp);

        // Growth should be reasonable for exponential curve
        // Early levels grow faster (up to ~100%), later levels slower
        const growth = (nextLevelXp - currentLevelXp) / currentLevelXp;
        expect(growth).toBeGreaterThan(0.05); // At least 5% growth
        expect(growth).toBeLessThan(1.5); // But not more than 150% per level
      }
    });
  });
});
