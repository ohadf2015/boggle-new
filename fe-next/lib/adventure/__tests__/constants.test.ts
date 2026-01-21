/**
 * Adventure Mode Constants Tests
 *
 * Tests for game constants and utility functions
 * Following TDD: Write tests FIRST, then implement
 */

import {
  // Core constants
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  MAX_PLAYER_LEVEL,
  TOTAL_LEVELS,
  // XP constants
  BASE_COMPLETION_XP,
  XP_PER_STAR,
  // Progression constants
  STARS_TO_UNLOCK_NEXT_LEVEL,
  STARS_TO_UNLOCK_NEXT_WORLD,
  TOTAL_STARS_FOR_FINAL_WORLD,
  // Tile and objective constants
  TILE_TYPES,
  OBJECTIVE_TYPES,
  // Grid and timer configuration
  GRID_SIZES,
  TIMER_DURATIONS,
  // Utility functions
  getXpForLevel,
  getLevelFromXp,
  getXpProgressInLevel,
  getWorldUnlockRequirement,
  isWorldUnlocked,
  isLevelUnlocked,
} from '../constants';

describe('Adventure Constants', () => {
  describe('Core Constants', () => {
    it('should have 10 worlds', () => {
      expect(WORLDS_COUNT).toBe(10);
    });

    it('should have 10 levels per world', () => {
      expect(LEVELS_PER_WORLD).toBe(10);
    });

    it('should have 100 total levels', () => {
      expect(TOTAL_LEVELS).toBe(100);
    });

    it('should have max player level of 50', () => {
      expect(MAX_PLAYER_LEVEL).toBe(50);
    });
  });

  describe('XP Constants', () => {
    it('should award 50 base XP per completion', () => {
      expect(BASE_COMPLETION_XP).toBe(50);
    });

    it('should award 25 XP per star', () => {
      expect(XP_PER_STAR).toBe(25);
    });
  });

  describe('Tile Types', () => {
    it('should have all 5 tile types', () => {
      expect(TILE_TYPES.STANDARD).toBe('standard');
      expect(TILE_TYPES.GOLD).toBe('gold');
      expect(TILE_TYPES.ICE).toBe('ice');
      expect(TILE_TYPES.BOMB).toBe('bomb');
      expect(TILE_TYPES.RAINBOW).toBe('rainbow');
    });
  });

  describe('Objective Types', () => {
    it('should have all 6 objective types', () => {
      expect(OBJECTIVE_TYPES.WORD_COUNT).toBe('wordCount');
      expect(OBJECTIVE_TYPES.SCORE_TARGET).toBe('scoreTarget');
      expect(OBJECTIVE_TYPES.CLEAR_ICE).toBe('clearIce');
      expect(OBJECTIVE_TYPES.LONG_WORDS).toBe('longWords');
      expect(OBJECTIVE_TYPES.TIME_BONUS).toBe('timeBonus');
      expect(OBJECTIVE_TYPES.COLLECT_GEMS).toBe('collectGems');
    });
  });

  describe('Grid Sizes', () => {
    it('should have grid size for each world', () => {
      // Worlds 1-2: 4x4 (tutorial)
      expect(GRID_SIZES[1]).toBe(4);
      expect(GRID_SIZES[2]).toBe(4);

      // Worlds 3-5: 5x5 (standard)
      expect(GRID_SIZES[3]).toBe(5);
      expect(GRID_SIZES[4]).toBe(5);
      expect(GRID_SIZES[5]).toBe(5);

      // Worlds 6-8: 6x6 (challenging)
      expect(GRID_SIZES[6]).toBe(6);
      expect(GRID_SIZES[7]).toBe(6);
      expect(GRID_SIZES[8]).toBe(6);

      // Worlds 9-10: 7x7 (expert)
      expect(GRID_SIZES[9]).toBe(7);
      expect(GRID_SIZES[10]).toBe(7);
    });
  });

  describe('Timer Durations', () => {
    it('should decrease timer with higher worlds', () => {
      // World 1 has longest timer
      expect(TIMER_DURATIONS[1]).toBeGreaterThanOrEqual(90);

      // World 10 has shortest timer
      expect(TIMER_DURATIONS[10]).toBeLessThanOrEqual(45);

      // Timer decreases as worlds increase
      expect(TIMER_DURATIONS[5]).toBeLessThan(TIMER_DURATIONS[1]);
      expect(TIMER_DURATIONS[10]).toBeLessThan(TIMER_DURATIONS[5]);
    });
  });
});

describe('XP Calculation Functions', () => {
  describe('getXpForLevel', () => {
    it('should return 0 for level 1', () => {
      // GIVEN
      const level = 1;

      // WHEN
      const result = getXpForLevel(level);

      // THEN
      expect(result).toBe(0);
    });

    it('should return 0 for level 0 or negative', () => {
      expect(getXpForLevel(0)).toBe(0);
      expect(getXpForLevel(-1)).toBe(0);
    });

    it('should use curved progression formula (N^1.5 * 100)', () => {
      // GIVEN - Level 10

      // WHEN
      const result = getXpForLevel(10);

      // THEN - Level 10 requires 10^1.5 * 100 ≈ 3162 XP
      const expected = Math.floor(Math.pow(10, 1.5) * 100);
      expect(result).toBe(expected);
    });

    it('should cap at level 50', () => {
      // Levels above 50 should return same as level 50
      const level50Xp = getXpForLevel(50);
      const level51Xp = getXpForLevel(51);
      const level100Xp = getXpForLevel(100);

      expect(level51Xp).toBe(level50Xp);
      expect(level100Xp).toBe(level50Xp);
    });
  });

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(getLevelFromXp(-100)).toBe(1);
    });

    it('should calculate correct level from XP', () => {
      // Just under level 2 threshold
      const level2Threshold = getXpForLevel(2);
      expect(getLevelFromXp(level2Threshold - 1)).toBe(1);
      expect(getLevelFromXp(level2Threshold)).toBe(2);
    });

    it('should cap at level 50', () => {
      // Even with massive XP, cap at 50
      expect(getLevelFromXp(999999999)).toBe(50);
    });

    it('should be inverse of getXpForLevel', () => {
      // getLevelFromXp(getXpForLevel(N)) should return N
      for (let level = 1; level <= 50; level++) {
        const xp = getXpForLevel(level);
        expect(getLevelFromXp(xp)).toBe(level);
      }
    });
  });

  describe('getXpProgressInLevel', () => {
    it('should return progress percentage within current level', () => {
      // GIVEN - Exactly at level 5
      const xpAtLevel5 = getXpForLevel(5);
      const xpAtLevel6 = getXpForLevel(6);
      const midwayXp = xpAtLevel5 + (xpAtLevel6 - xpAtLevel5) / 2;

      // WHEN
      const progress = getXpProgressInLevel(midwayXp);

      // THEN - Should be approximately 50%
      expect(progress).toBeGreaterThanOrEqual(0.49);
      expect(progress).toBeLessThanOrEqual(0.51);
    });

    it('should return 0 at level boundary', () => {
      const xpAtLevel3 = getXpForLevel(3);
      const progress = getXpProgressInLevel(xpAtLevel3);
      expect(progress).toBeCloseTo(0, 1);
    });

    it('should return value between 0 and 1', () => {
      // Test various XP values
      const testXps = [0, 100, 500, 1000, 5000, 10000];
      for (const xp of testXps) {
        const progress = getXpProgressInLevel(xp);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('World Unlock Functions', () => {
  describe('getWorldUnlockRequirement', () => {
    it('should return 0 for world 1 (always unlocked)', () => {
      expect(getWorldUnlockRequirement(1)).toBe(0);
    });

    it('should require 15 stars per world', () => {
      // World 2 requires 15 stars
      expect(getWorldUnlockRequirement(2)).toBe(15);
      // World 3 requires 30 stars
      expect(getWorldUnlockRequirement(3)).toBe(30);
      // World 4 requires 45 stars
      expect(getWorldUnlockRequirement(4)).toBe(45);
    });

    it('should require 80 stars for world 10', () => {
      // Final world has special requirement
      expect(getWorldUnlockRequirement(10)).toBe(80);
    });

    it('should handle invalid world numbers', () => {
      expect(getWorldUnlockRequirement(0)).toBe(0);
      expect(getWorldUnlockRequirement(-1)).toBe(0);
      expect(getWorldUnlockRequirement(11)).toBe(80);
    });
  });

  describe('isWorldUnlocked', () => {
    it('should always unlock world 1', () => {
      expect(isWorldUnlocked(1, 0)).toBe(true);
    });

    it('should unlock world 2 with 15+ stars', () => {
      expect(isWorldUnlocked(2, 14)).toBe(false);
      expect(isWorldUnlocked(2, 15)).toBe(true);
      expect(isWorldUnlocked(2, 30)).toBe(true);
    });

    it('should unlock world 10 with 80+ stars', () => {
      expect(isWorldUnlocked(10, 79)).toBe(false);
      expect(isWorldUnlocked(10, 80)).toBe(true);
    });
  });

  describe('isLevelUnlocked', () => {
    it('should always unlock level 1 of any world', () => {
      const completions: Array<{ world: number; level: number; stars: number }> = [];
      expect(isLevelUnlocked(1, 1, completions)).toBe(true);
      expect(isLevelUnlocked(5, 1, completions)).toBe(true);
      expect(isLevelUnlocked(10, 1, completions)).toBe(true);
    });

    it('should require previous level completion with at least 1 star', () => {
      // No completions - level 2 locked
      expect(isLevelUnlocked(1, 2, [])).toBe(false);

      // Level 1 completed with 1 star - level 2 unlocked
      const completions = [{ world: 1, level: 1, stars: 1 }];
      expect(isLevelUnlocked(1, 2, completions)).toBe(true);
    });

    it('should require completing previous level in same world', () => {
      // Completed level 5 in world 1 - level 6 in world 1 unlocked
      const completions = [{ world: 1, level: 5, stars: 2 }];
      expect(isLevelUnlocked(1, 6, completions)).toBe(true);

      // But level 2 in world 2 is NOT unlocked (different world)
      expect(isLevelUnlocked(2, 2, completions)).toBe(false);
    });

    it('should check stars >= 1', () => {
      // 0 stars doesn't count as completion
      const zeroStars = [{ world: 1, level: 1, stars: 0 }];
      expect(isLevelUnlocked(1, 2, zeroStars)).toBe(false);

      // 1+ stars unlocks next level
      const oneStars = [{ world: 1, level: 1, stars: 1 }];
      expect(isLevelUnlocked(1, 2, oneStars)).toBe(true);
    });
  });
});
