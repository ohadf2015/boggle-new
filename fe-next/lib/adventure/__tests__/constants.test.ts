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
  STARS_TO_UNLOCK_NEXT_WORLD,
  // Tile and objective constants
  TILE_TYPES,
  OBJECTIVE_TYPES,
  // Grid and timer configuration
  GRID_SIZES,
  TIMER_DURATIONS,
  // Utility functions
  getWorldUnlockRequirement,
  isWorldUnlocked,
  isLevelUnlocked,
} from '../constants';

describe('Adventure Constants', () => {
  describe('Core Constants', () => {
    it('should have 10 worlds', () => {
      expect(WORLDS_COUNT).toBe(10);
    });

    it('should have 7 levels per world (2-2-3 chapter structure)', () => {
      expect(LEVELS_PER_WORLD).toBe(7);
    });

    it('should have 70 total levels', () => {
      expect(TOTAL_LEVELS).toBe(70);
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
      expect(TILE_TYPES.TIME).toBe('time');
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
    it('should scale timer with grid size (bumps at grid transitions)', () => {
      // World 1 starts generous for tutorial — F3 fun audit (2026-05-01):
      // bumped 120→150 so new players have ≥9s per tile to grok board reading.
      expect(TIMER_DURATIONS[1]).toBe(150);

      // Timer bumps UP when grid size increases (worlds 3, 6, 9)
      // to maintain consistent per-tile search time
      expect(TIMER_DURATIONS[3]).toBeGreaterThan(TIMER_DURATIONS[2]); // 4x4→5x5
      expect(TIMER_DURATIONS[6]).toBeGreaterThan(TIMER_DURATIONS[5]); // 5x5→6x6
      expect(TIMER_DURATIONS[9]).toBeGreaterThan(TIMER_DURATIONS[8]); // 6x6→7x7

      // Within same grid size, timer decreases gently
      expect(TIMER_DURATIONS[2]).toBeLessThan(TIMER_DURATIONS[1]); // both 4x4
      expect(TIMER_DURATIONS[5]).toBeLessThan(TIMER_DURATIONS[3]); // both 5x5
      expect(TIMER_DURATIONS[8]).toBeLessThan(TIMER_DURATIONS[6]); // both 6x6
      expect(TIMER_DURATIONS[10]).toBeLessThan(TIMER_DURATIONS[9]); // both 7x7
    });

    it('should maintain reasonable per-tile search time across all worlds', () => {
      const GRID_TILES: Record<number, number> = {
        1: 16, 2: 16, 3: 25, 4: 25, 5: 25, 6: 36, 7: 36, 8: 36, 9: 49, 10: 49,
      };
      for (let world = 1; world <= 10; world++) {
        const perTile = TIMER_DURATIONS[world] / GRID_TILES[world];
        // Every world should give at least 3 seconds per tile
        expect(perTile).toBeGreaterThanOrEqual(3);
        // And no more than 10 (early worlds are intentionally generous)
        expect(perTile).toBeLessThanOrEqual(10);
      }
    });

    // F3 (audit 2026-05-01) — tutorial-world generosity contract.
    // Prevents future regression that re-tightens W1 below the FTUE threshold.
    it('should give World 1 at least 9 seconds per tile (FTUE generosity)', () => {
      const W1_TILES = 16; // 4x4
      expect(TIMER_DURATIONS[1] / W1_TILES).toBeGreaterThanOrEqual(9);
    });
  });
});

describe('World Unlock Functions', () => {
  describe('getWorldUnlockRequirement', () => {
    it('should return 0 for world 1 (always unlocked)', () => {
      expect(getWorldUnlockRequirement(1)).toBe(0);
    });

    it('should require stars per world with consistent 11-star gaps from W2', () => {
      expect(getWorldUnlockRequirement(2)).toBe(7);
      expect(getWorldUnlockRequirement(3)).toBe(18);
      expect(getWorldUnlockRequirement(4)).toBe(29);
    });

    it('should require 95 stars for world 10', () => {
      expect(getWorldUnlockRequirement(10)).toBe(95);
    });

    it('should use formula 7+11*(N-2) for worlds 3-10, W2 special-cased to 7', () => {
      expect(getWorldUnlockRequirement(2)).toBe(7);
      for (let world = 3; world <= WORLDS_COUNT; world++) {
        expect(getWorldUnlockRequirement(world)).toBe(7 + STARS_TO_UNLOCK_NEXT_WORLD * (world - 2));
      }
    });

    it('should handle invalid world numbers', () => {
      expect(getWorldUnlockRequirement(0)).toBe(0);
      expect(getWorldUnlockRequirement(-1)).toBe(0);
      expect(getWorldUnlockRequirement(11)).toBe(95);
    });
  });

  describe('isWorldUnlocked', () => {
    it('should always unlock world 1', () => {
      expect(isWorldUnlocked(1, 0)).toBe(true);
    });

    it('should unlock world 2 with 7+ stars', () => {
      expect(isWorldUnlocked(2, 6)).toBe(false);
      expect(isWorldUnlocked(2, 7)).toBe(true);
      expect(isWorldUnlocked(2, 21)).toBe(true);
    });

    it('should unlock world 10 with 95+ stars', () => {
      expect(isWorldUnlocked(10, 94)).toBe(false);
      expect(isWorldUnlocked(10, 95)).toBe(true);
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
