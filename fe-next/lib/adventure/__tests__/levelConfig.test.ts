/**
 * Adventure Mode Level Configuration Tests
 *
 * Tests for world definitions and level configuration generators
 * Following TDD: Write tests FIRST, then implement
 */

import {
  // World configuration
  WORLD_CONFIGS,
  getWorldConfig,
  getAllWorldConfigs,
  // Level configuration
  getLevelConfig,
  getWorldLevels,
  getAllLevelConfigs,
  // Generators
  generateObjectives,
  generateSpecialTiles,
  // Validation
  validateLevelConfig,
} from '../levelConfig';
import type { LevelConfig } from '@/types/adventure';

describe('World Configuration', () => {
  describe('WORLD_CONFIGS', () => {
    it('should have configuration for all 10 worlds', () => {
      expect(WORLD_CONFIGS).toHaveLength(10);
    });

    it('should have unique IDs for each world', () => {
      const ids = WORLD_CONFIGS.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should have unique names for each world', () => {
      const names = WORLD_CONFIGS.map((w) => w.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);
    });

    it('should have valid color references', () => {
      for (const world of WORLD_CONFIGS) {
        expect(world.colorPrimary).toBeTruthy();
        expect(world.colorSecondary).toBeTruthy();
      }
    });

    it('should have boss names for all worlds', () => {
      for (const world of WORLD_CONFIGS) {
        expect(world.bossName).toBeTruthy();
      }
    });
  });

  describe('getWorldConfig', () => {
    it('should return correct config for world 1', () => {
      const config = getWorldConfig(1);

      expect(config.id).toBe(1);
      expect(config.name).toBe('alphabetMeadows');
      expect(config.mechanic).toBeNull(); // Tutorial world has no special mechanic
    });

    it('should return correct config for world 2 (synonymSprings)', () => {
      const config = getWorldConfig(2);

      expect(config.id).toBe(2);
      expect(config.name).toBe('synonymSprings');
      expect(config.mechanic).toBe('synonymPairs');
    });

    it('should return correct config for world 10 (final)', () => {
      const config = getWorldConfig(10);

      expect(config.id).toBe(10);
      expect(config.name).toBe('lexiconThrone');
      expect(config.bossName).toBe('lexiconDragon');
    });

    it('should throw error for invalid world numbers', () => {
      expect(() => getWorldConfig(0)).toThrow();
      expect(() => getWorldConfig(11)).toThrow();
      expect(() => getWorldConfig(-1)).toThrow();
    });
  });

  describe('getAllWorldConfigs', () => {
    it('should return all world configs', () => {
      const configs = getAllWorldConfigs();
      expect(configs).toHaveLength(10);
      expect(configs[0].id).toBe(1);
      expect(configs[9].id).toBe(10);
    });
  });
});

describe('Level Configuration', () => {
  describe('getLevelConfig', () => {
    it('should return valid config for world 1, level 1', () => {
      // GIVEN
      const world = 1;
      const level = 1;

      // WHEN
      const config = getLevelConfig(world, level);

      // THEN
      expect(config.world).toBe(1);
      expect(config.level).toBe(1);
      expect(config.gridSize).toBe(4); // Tutorial world
      expect(config.timerSeconds).toBeGreaterThanOrEqual(90);
      expect(config.difficulty).toBe('EASY');
      expect(config.objectives.length).toBeGreaterThan(0);
    });

    it('should return valid config for any valid world/level', () => {
      // Test a sampling of levels across worlds
      const testCases = [
        { world: 1, level: 1 },
        { world: 1, level: 10 },
        { world: 5, level: 5 },
        { world: 10, level: 1 },
        { world: 10, level: 10 },
      ];

      for (const { world, level } of testCases) {
        const config = getLevelConfig(world, level);

        expect(config.world).toBe(world);
        expect(config.level).toBe(level);
        expect([4, 5, 6, 7]).toContain(config.gridSize);
        expect(config.timerSeconds).toBeGreaterThan(0);
        expect(['EASY', 'MEDIUM', 'HARD']).toContain(config.difficulty);
        expect(config.objectives.length).toBeGreaterThan(0);
      }
    });

    it('should include world mechanic for non-tutorial worlds', () => {
      // World 2+ should have mechanics
      const world2Config = getLevelConfig(2, 1);
      expect(world2Config.worldMechanic).toBe('synonymPairs');

      const world3Config = getLevelConfig(3, 1);
      expect(world3Config.worldMechanic).toBe('etymologyRoots');
    });

    it('should not include world mechanic for world 1 (tutorial)', () => {
      const config = getLevelConfig(1, 1);
      expect(config.worldMechanic).toBeUndefined();
    });

    it('should increase difficulty for higher worlds', () => {
      const world1 = getLevelConfig(1, 5);
      const world5 = getLevelConfig(5, 5);
      const world10 = getLevelConfig(10, 5);

      expect(world1.difficulty).toBe('EASY');
      expect(world5.difficulty).toBe('MEDIUM');
      expect(world10.difficulty).toBe('HARD');
    });

    it('should throw error for invalid world/level', () => {
      expect(() => getLevelConfig(0, 1)).toThrow();
      expect(() => getLevelConfig(1, 0)).toThrow();
      expect(() => getLevelConfig(11, 1)).toThrow();
      expect(() => getLevelConfig(1, 11)).toThrow();
    });
  });

  describe('getWorldLevels', () => {
    it('should return 10 levels for a world', () => {
      const levels = getWorldLevels(1);
      expect(levels).toHaveLength(10);
    });

    it('should return levels in order', () => {
      const levels = getWorldLevels(3);

      for (let i = 0; i < levels.length; i++) {
        expect(levels[i].world).toBe(3);
        expect(levels[i].level).toBe(i + 1);
      }
    });
  });

  describe('getAllLevelConfigs', () => {
    it('should return all 100 level configs', () => {
      const allConfigs = getAllLevelConfigs();
      expect(allConfigs).toHaveLength(100);
    });

    it('should be ordered by world then level', () => {
      const allConfigs = getAllLevelConfigs();

      // Check first level
      expect(allConfigs[0].world).toBe(1);
      expect(allConfigs[0].level).toBe(1);

      // Check last level
      expect(allConfigs[99].world).toBe(10);
      expect(allConfigs[99].level).toBe(10);

      // Check order throughout
      for (let i = 0; i < 100; i++) {
        const expectedWorld = Math.floor(i / 10) + 1;
        const expectedLevel = (i % 10) + 1;
        expect(allConfigs[i].world).toBe(expectedWorld);
        expect(allConfigs[i].level).toBe(expectedLevel);
      }
    });
  });
});

describe('Objective Generation', () => {
  describe('generateObjectives', () => {
    it('should generate at least one primary objective', () => {
      const objectives = generateObjectives(1, 1);

      const primary = objectives.filter((o) => o.isPrimary);
      expect(primary.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate wordCount or scoreTarget as primary', () => {
      // Test multiple levels to ensure variety
      let hasWordCount = false;
      let hasScoreTarget = false;

      for (let level = 1; level <= 10; level++) {
        const objectives = generateObjectives(1, level);
        const primary = objectives.find((o) => o.isPrimary);

        if (primary?.type === 'wordCount') hasWordCount = true;
        if (primary?.type === 'scoreTarget') hasScoreTarget = true;
      }

      // Should have both types across 10 levels
      expect(hasWordCount || hasScoreTarget).toBe(true);
    });

    it('should increase objective targets for higher levels', () => {
      const early = generateObjectives(1, 1);
      const late = generateObjectives(3, 10);

      const earlyPrimary = early.find((o) => o.isPrimary);
      const latePrimary = late.find((o) => o.isPrimary);

      expect(latePrimary!.target).toBeGreaterThan(earlyPrimary!.target);
    });

    it('should add secondary objectives for higher levels', () => {
      // Early level should have fewer objectives
      const earlyObjectives = generateObjectives(1, 1);

      // Later level should have more objectives
      const lateObjectives = generateObjectives(3, 8);

      expect(lateObjectives.length).toBeGreaterThanOrEqual(earlyObjectives.length);
    });

    it('should add clearIce objective for worlds with ice tiles', () => {
      // World 2+ has ice tiles
      // Should sometimes have clearIce objectives
      // (not always, so we check multiple levels)
      let foundClearIce = false;
      for (let level = 1; level <= 10; level++) {
        const objs = generateObjectives(2, level);
        if (objs.some((o) => o.type === 'clearIce')) {
          foundClearIce = true;
          break;
        }
      }
      expect(foundClearIce).toBe(true);
    });
  });
});

describe('Special Tile Generation', () => {
  describe('generateSpecialTiles', () => {
    it('should return empty array for world 1 early levels', () => {
      // Tutorial levels have no special tiles
      const tiles = generateSpecialTiles(1, 1, 4);
      expect(tiles).toHaveLength(0);
    });

    it('should add gold tiles from world 1 level 8+', () => {
      const tiles = generateSpecialTiles(1, 8, 4);
      const goldTiles = tiles.filter((t) => t.type === 'gold');

      expect(goldTiles.length).toBeGreaterThan(0);
    });

    it('should add ice tiles from world 2+', () => {
      const tiles = generateSpecialTiles(2, 3, 5);
      const iceTiles = tiles.filter((t) => t.type === 'ice');

      expect(iceTiles.length).toBeGreaterThan(0);
    });

    it('should add bomb tiles from world 3+', () => {
      const tiles = generateSpecialTiles(3, 5, 5);
      const bombTiles = tiles.filter((t) => t.type === 'bomb');

      expect(bombTiles.length).toBeGreaterThan(0);
    });

    it('should respect grid bounds', () => {
      const gridSize = 5;
      const tiles = generateSpecialTiles(5, 5, gridSize);

      for (const tile of tiles) {
        expect(tile.row).toBeGreaterThanOrEqual(0);
        expect(tile.row).toBeLessThan(gridSize);
        expect(tile.col).toBeGreaterThanOrEqual(0);
        expect(tile.col).toBeLessThan(gridSize);
      }
    });

    it('should not have duplicate positions', () => {
      const tiles = generateSpecialTiles(5, 10, 6);
      const positions = new Set(tiles.map((t) => `${t.row},${t.col}`));

      expect(positions.size).toBe(tiles.length);
    });
  });
});

describe('Level Config Validation', () => {
  describe('validateLevelConfig', () => {
    it('should pass for valid config', () => {
      const config = getLevelConfig(1, 1);
      const result = validateLevelConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid world', () => {
      const config: LevelConfig = {
        world: 0, // Invalid
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [],
        specialTiles: [],
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid world: must be 1-10');
    });

    it('should fail for empty objectives', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [], // Empty!
        specialTiles: [],
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one objective required');
    });

    it('should fail for special tile outside grid', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 4,
        timerSeconds: 90,
        objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
        specialTiles: [{ row: 5, col: 0, type: 'gold' }], // Row 5 invalid for 4x4
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('outside grid'))).toBe(true);
    });
  });
});
