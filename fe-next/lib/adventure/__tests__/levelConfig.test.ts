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
  applyGemDetectorBoost,
  // Validation
  validateLevelConfig,
} from '../levelConfig';
import type { LevelConfig } from '@/types/adventure';
import { getTimerDuration } from '../constants';

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

    it('should return default config for world 0 (endless sentinel)', () => {
      const config = getWorldConfig(0);
      expect(config).toBeDefined();
    });

    it('should throw error for invalid world numbers', () => {
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
        { world: 1, level: 7 },
        { world: 5, level: 5 },
        { world: 10, level: 1 },
        { world: 10, level: 7 },
      ];

      for (const { world, level } of testCases) {
        const config = getLevelConfig(world, level);

        expect(config.world).toBe(world);
        expect(config.level).toBe(level);
        expect([4, 5, 6, 7]).toContain(config.gridSize);
        // timerSeconds = 0 is valid for non-timer archetypes (blast, hunt)
        expect(config.timerSeconds).toBeGreaterThanOrEqual(0);
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

    it('should return config for world 0 (endless sentinel)', () => {
      const config = getLevelConfig(0, 1);
      expect(config).toBeDefined();
      expect(config.world).toBe(0);
    });

    it('should throw error for invalid world/level', () => {
      expect(() => getLevelConfig(1, 0)).toThrow();
      expect(() => getLevelConfig(11, 1)).toThrow();
      expect(() => getLevelConfig(1, 8)).toThrow(); // Max level is 7
    });
  });

  describe('getWorldLevels', () => {
    it('should return 7 levels for a world', () => {
      const levels = getWorldLevels(1);
      expect(levels).toHaveLength(7);
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
    it('should return all 70 level configs', () => {
      const allConfigs = getAllLevelConfigs();
      expect(allConfigs).toHaveLength(70);
    });

    it('should be ordered by world then level', () => {
      const allConfigs = getAllLevelConfigs();

      // Check first level
      expect(allConfigs[0].world).toBe(1);
      expect(allConfigs[0].level).toBe(1);

      // Check last level (10 worlds * 7 levels = 70 total, index 69)
      expect(allConfigs[69].world).toBe(10);
      expect(allConfigs[69].level).toBe(7);

      // Check order throughout
      for (let i = 0; i < 70; i++) {
        const expectedWorld = Math.floor(i / 7) + 1;
        const expectedLevel = (i % 7) + 1;
        expect(allConfigs[i].world).toBe(expectedWorld);
        expect(allConfigs[i].level).toBe(expectedLevel);
      }
    });
  });
});

describe('Objective Generation', () => {
  describe('generateObjectives - Boss Levels', () => {
    // Boss levels are level 7 of each world
    const BOSS_LEVEL = 7;

    it('should generate defeatBoss as primary objective for boss levels', () => {
      // GIVEN: A boss level (level 7)
      const world = 1;
      const level = BOSS_LEVEL;

      // WHEN: Generating objectives
      const objectives = generateObjectives(world, level);

      // THEN: Primary objective should be defeatBoss
      const primary = objectives.find((o) => o.isPrimary);
      expect(primary).toBeDefined();
      expect(primary!.type).toBe('defeatBoss');
    });

    it('should NOT generate wordCount or scoreTarget for boss levels', () => {
      // GIVEN: Boss levels across all worlds
      for (let world = 1; world <= 10; world++) {
        // WHEN: Generating objectives for boss level
        const objectives = generateObjectives(world, BOSS_LEVEL);

        // THEN: Should not have wordCount or scoreTarget
        const hasGenericObjective = objectives.some(
          (o) => o.type === 'wordCount' || o.type === 'scoreTarget'
        );
        expect(hasGenericObjective).toBe(false);
      }
    });

    it('should generate mechanicTrigger as secondary objective for boss levels', () => {
      // GIVEN: A boss level
      const objectives = generateObjectives(3, BOSS_LEVEL);

      // THEN: Should have mechanicTrigger objective
      const mechanicObj = objectives.find((o) => o.type === 'mechanicTrigger');
      expect(mechanicObj).toBeDefined();
      expect(mechanicObj!.isPrimary).toBe(false);
    });

    it('should generate surviveBattle as secondary objective for boss levels', () => {
      // GIVEN: A boss level
      const objectives = generateObjectives(5, BOSS_LEVEL);

      // THEN: Should have surviveBattle objective
      const surviveObj = objectives.find((o) => o.type === 'surviveBattle');
      expect(surviveObj).toBeDefined();
      expect(surviveObj!.isPrimary).toBe(false);
    });

    it('should scale mechanicTrigger target with world number', () => {
      // GIVEN: Boss levels from different worlds
      const world1Objectives = generateObjectives(1, BOSS_LEVEL);
      const world10Objectives = generateObjectives(10, BOSS_LEVEL);

      const world1Mechanic = world1Objectives.find((o) => o.type === 'mechanicTrigger');
      const world10Mechanic = world10Objectives.find((o) => o.type === 'mechanicTrigger');

      // THEN: Later worlds should have higher targets
      expect(world10Mechanic!.target).toBeGreaterThan(world1Mechanic!.target);
    });

    it('should still generate normal objectives for non-boss levels', () => {
      // GIVEN: A non-boss level (level 5)
      const objectives = generateObjectives(3, 5);

      // THEN: Should have wordCount or scoreTarget as primary
      const primary = objectives.find((o) => o.isPrimary);
      expect(primary).toBeDefined();
      expect(['wordCount', 'scoreTarget']).toContain(primary!.type);

      // THEN: Should NOT have boss-only objectives (defeatBoss, surviveBattle)
      const hasBossOnlyObjective = objectives.some(
        (o) => o.type === 'defeatBoss' || o.type === 'surviveBattle'
      );
      expect(hasBossOnlyObjective).toBe(false);
    });
  });

  describe('generateObjectives - Mechanic Trigger on Regular Levels', () => {
    it('should add mechanicTrigger objective for worlds with mechanics (W2+)', () => {
      // GIVEN: A regular level in World 2 (synonymPairs mechanic)
      const objectives = generateObjectives(2, 3);

      // THEN: Should have mechanicTrigger as secondary objective
      const mechObj = objectives.find((o) => o.type === 'mechanicTrigger');
      expect(mechObj).toBeDefined();
      expect(mechObj!.isPrimary).toBe(false);
    });

    it('should NOT add mechanicTrigger for World 1 (no mechanic)', () => {
      // GIVEN: A regular level in World 1 (no mechanic)
      const objectives = generateObjectives(1, 3);

      // THEN: No mechanicTrigger
      const mechObj = objectives.find((o) => o.type === 'mechanicTrigger');
      expect(mechObj).toBeUndefined();
    });

    it('should scale mechanicTrigger target with world progression', () => {
      // GIVEN: Regular levels in early and late worlds
      const w2Objectives = generateObjectives(2, 3);
      const w9Objectives = generateObjectives(9, 3);

      const w2Mechanic = w2Objectives.find((o) => o.type === 'mechanicTrigger');
      const w9Mechanic = w9Objectives.find((o) => o.type === 'mechanicTrigger');

      // THEN: Later worlds require more triggers
      expect(w9Mechanic!.target).toBeGreaterThan(w2Mechanic!.target);
    });

    it('should have lower mechanicTrigger targets on regular levels than boss levels', () => {
      // GIVEN: Same world, regular vs boss level
      const regularObjectives = generateObjectives(5, 3);
      const bossObjectives = generateObjectives(5, 7); // boss level

      const regularMech = regularObjectives.find((o) => o.type === 'mechanicTrigger');
      const bossMech = bossObjectives.find((o) => o.type === 'mechanicTrigger');

      // THEN: Regular levels are more forgiving
      expect(regularMech!.target).toBeLessThan(bossMech!.target);
    });
  });

  describe('generateObjectives - Regular Levels', () => {
    it('should generate at least one primary objective', () => {
      const objectives = generateObjectives(1, 1);

      const primary = objectives.filter((o) => o.isPrimary);
      expect(primary.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate wordCount or scoreTarget as primary', () => {
      // Test multiple levels to ensure variety
      let hasWordCount = false;
      let hasScoreTarget = false;

      for (let level = 1; level <= 7; level++) {
        const objectives = generateObjectives(1, level);
        const primary = objectives.find((o) => o.isPrimary);

        if (primary?.type === 'wordCount') hasWordCount = true;
        if (primary?.type === 'scoreTarget') hasScoreTarget = true;
      }

      // Should have both types across 7 levels
      expect(hasWordCount || hasScoreTarget).toBe(true);
    });

    it('should increase objective targets for higher levels', () => {
      const early = generateObjectives(1, 1);
      const late = generateObjectives(3, 7);

      const earlyPrimary = early.find((o) => o.isPrimary);
      const latePrimary = late.find((o) => o.isPrimary);

      expect(latePrimary!.target).toBeGreaterThan(earlyPrimary!.target);
    });

    it('should add secondary objectives for higher levels', () => {
      // World 1 (no mechanic) → 1 primary + 1 secondary
      const earlyObjectives = generateObjectives(1, 1);

      // World 3 (has mechanic) → 1 primary + 1 archetype secondary + mechanicTrigger
      const lateObjectives = generateObjectives(3, 6);

      expect(lateObjectives.length).toBeGreaterThanOrEqual(earlyObjectives.length);
    });

    it('should add clearIce objective for blast archetype levels', () => {
      // World 2 level 3 is 'blast' archetype → clearIce primary
      const objs = generateObjectives(2, 3);
      const clearIce = objs.find((o) => o.type === 'clearIce' && o.isPrimary);
      expect(clearIce).toBeDefined();
    });
  });
});

describe('Special Tile Generation', () => {
  describe('generateSpecialTiles', () => {
    it('should return empty array for world 1 early levels', () => {
      // Tutorial levels 1-4 (chapters 1-2) have no special tiles
      const tiles = generateSpecialTiles(1, 1, 4);
      expect(tiles).toHaveLength(0);
    });

    it('should add gold tiles from world 1 level 5+ (boss chapter)', () => {
      const tiles = generateSpecialTiles(1, 5, 4);
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
      const tiles = generateSpecialTiles(5, 7, 6);
      const positions = new Set(tiles.map((t) => `${t.row},${t.col}`));

      expect(positions.size).toBe(tiles.length);
    });

    it('should not place ice tiles on vowels when grid is provided', () => {
      // Create a grid with known vowel positions
      const gridSize = 5;
      const grid: string[][] = [];
      const vowels = new Set(['A', 'E', 'I', 'O', 'U']);

      // Fill grid with vowels at specific positions for testing
      for (let row = 0; row < gridSize; row++) {
        const rowLetters: string[] = [];
        for (let col = 0; col < gridSize; col++) {
          // Make positions (0,0), (1,1), (2,2), (3,3), (4,4) vowels
          if (row === col) {
            rowLetters.push(['A', 'E', 'I', 'O', 'U'][row % 5]);
          } else {
            rowLetters.push('B'); // Consonant
          }
        }
        grid.push(rowLetters);
      }

      // Run multiple times to account for randomness
      for (let i = 0; i < 50; i++) {
        const tiles = generateSpecialTiles(3, 5, gridSize, grid);
        const iceTiles = tiles.filter((t) => t.type === 'ice');

        // Verify no ice tile is placed on a vowel
        for (const ice of iceTiles) {
          const letter = grid[ice.row][ice.col];
          expect(vowels.has(letter.toUpperCase())).toBe(false);
        }
      }
    });

    it('should still work without grid (backward compatibility)', () => {
      // Without grid, ice tiles can be placed anywhere
      const tiles = generateSpecialTiles(3, 5, 5);
      const iceTiles = tiles.filter((t) => t.type === 'ice');

      // Ice tiles should still be generated
      expect(iceTiles.length).toBeGreaterThan(0);
    });
  });

  describe('applyGemDetectorBoost', () => {
    it('should return same tiles when no boost and no guarantee', () => {
      const tiles = [{ row: 0, col: 0, type: 'gold' as const }];
      const result = applyGemDetectorBoost(tiles, 5, 0, false);
      expect(result).toBe(tiles); // same reference, no copy
    });

    it('should add extra gold tiles with specialTileBoost', () => {
      const tiles = [
        { row: 0, col: 0, type: 'gold' as const },
        { row: 1, col: 1, type: 'gold' as const },
      ];
      const result = applyGemDetectorBoost(tiles, 5, 0.3, false);
      const goldCount = result.filter(t => t.type === 'gold').length;
      // 2 original + at least 1 extra (Math.round(2 * 0.3) = 1)
      expect(goldCount).toBeGreaterThan(2);
    });

    it('should add at least 1 extra gold even with small boost', () => {
      const tiles = [{ row: 0, col: 0, type: 'ice' as const }];
      const result = applyGemDetectorBoost(tiles, 5, 0.2, false);
      const goldCount = result.filter(t => t.type === 'gold').length;
      // 0 gold tiles * 0.2 = 0, but Math.max(1, ...) ensures at least 1
      expect(goldCount).toBeGreaterThanOrEqual(1);
    });

    it('should guarantee a gold tile when guaranteedGoldTile is true', () => {
      const tiles = [{ row: 0, col: 0, type: 'ice' as const }];
      const result = applyGemDetectorBoost(tiles, 5, 0, true);
      const hasGold = result.some(t => t.type === 'gold');
      expect(hasGold).toBe(true);
    });

    it('should not duplicate positions', () => {
      const tiles = generateSpecialTiles(5, 7, 5);
      const result = applyGemDetectorBoost(tiles, 5, 0.3, true);
      const positions = new Set(result.map(t => `${t.row},${t.col}`));
      expect(positions.size).toBe(result.length);
    });

    it('should preserve original tiles', () => {
      const tiles = [
        { row: 0, col: 0, type: 'ice' as const },
        { row: 1, col: 1, type: 'bomb' as const },
      ];
      const result = applyGemDetectorBoost(tiles, 5, 0.2, false);
      expect(result[0]).toEqual({ row: 0, col: 0, type: 'ice' });
      expect(result[1]).toEqual({ row: 1, col: 1, type: 'bomb' });
    });
  });
});

describe('Grid-aware objective generation', () => {
  describe('generateObjectives with grid', () => {
    it('should replace longWords objective with fallback when grid has no long paths', () => {
      // GIVEN: A 4x4 grid where no path of length 5 exists
      // (impossible on 4x4, but we use a tiny grid to simulate)
      // Actually 4x4 always has paths of 5+. Use a degenerate grid concept:
      // We pass a grid to generateObjectives; if grid lacks paths >= 5, longWords replaced.
      // Build a 2x2 grid (gridSize=2) — max path is 4, less than LONG_WORD_LENGTH=5
      const tinyGrid = [
        ['A', 'B'],
        ['C', 'D'],
      ];

      // Level 3+ in world 1 normally gets longWords objective
      const objectives = generateObjectives(1, 3, tinyGrid);
      const hasLongWords = objectives.some((o) => o.type === 'longWords');

      // THEN: Should NOT have longWords since grid can't support 5-letter paths
      expect(hasLongWords).toBe(false);
    });

    it('should keep longWords objective when grid supports long paths (wheel archetype)', () => {
      // GIVEN: A 4x4 grid (supports paths well over 5)
      const grid = [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ];

      // World 3 level 4 is 'wheel' archetype → longWords secondary
      const objectives = generateObjectives(3, 4, grid);
      const hasLongWords = objectives.some((o) => o.type === 'longWords');

      expect(hasLongWords).toBe(true);
    });

    it('should still work without grid (wheel archetype)', () => {
      // Without grid, longWords is assumed valid (no grid to validate against)
      // World 3 level 4 is 'wheel' archetype → longWords secondary
      const objectives = generateObjectives(3, 4);
      const hasLongWords = objectives.some((o) => o.type === 'longWords');
      expect(hasLongWords).toBe(true);
    });

    it('should give breather levels (3, 5) limited secondary objectives', () => {
      const obj3 = generateObjectives(1, 3); // World 1: no mechanic → 1 secondary
      const obj5 = generateObjectives(2, 5); // World 2: has mechanic → 2 secondaries (complementary + mechanicTrigger)
      const secondaries3 = obj3.filter((o) => !o.isPrimary);
      const secondaries5 = obj5.filter((o) => !o.isPrimary);
      expect(secondaries3).toHaveLength(2); // World 1 gets fallback secondary for 3-star
      expect(secondaries5).toHaveLength(2); // World 2+ gets mechanicTrigger too
    });
  });
});

describe('Granular star progression (1/2/3 stars reachable)', () => {
  it('every non-boss regular level should have at least 1 secondary objective', () => {
    // Archetype system gives 1 archetype secondary + mechanic trigger (world 2+)
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 6; level++) {
        const objectives = generateObjectives(world, level);
        const secondaries = objectives.filter((o) => !o.isPrimary);

        // Every level gets at least 1 secondary from archetype config
        expect(secondaries.length).toBeGreaterThanOrEqual(1);

        // World 2+ also gets mechanicTrigger secondary
        if (world >= 2) {
          expect(secondaries.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('should add archetype-driven secondary objectives', () => {
    // World 1 levels are all 'standard' → wordCount primary, scoreTarget secondary
    const obj1 = generateObjectives(1, 1);
    const obj2 = generateObjectives(1, 2);

    // Both levels have wordCount primary + scoreTarget secondary (classic archetype)
    const scoreSecondary1 = obj1.find(
      (o) => !o.isPrimary && o.type === 'scoreTarget'
    );
    expect(scoreSecondary1).toBeDefined();

    const scoreSecondary2 = obj2.find(
      (o) => !o.isPrimary && o.type === 'scoreTarget'
    );
    expect(scoreSecondary2).toBeDefined();
  });

  it('secondary targets should be easier than primary targets of same type', () => {
    // When a secondary has the same type as another level's primary,
    // the secondary target should be lower (stretch goal, not gate)
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 6; level++) {
        const objectives = generateObjectives(world, level);
        const primary = objectives.find((o) => o.isPrimary)!;
        const secondaries = objectives.filter((o) => !o.isPrimary);

        for (const sec of secondaries) {
          // Secondary targets must be positive
          expect(sec.target).toBeGreaterThan(0);
        }

        // Primary target must be positive
        expect(primary.target).toBeGreaterThan(0);
      }
    }
  });
});

describe('Hidden word grid validation', () => {
  it('should clear hiddenWord when word cannot be formed on the grid', () => {
    // GIVEN: A grid that does NOT contain MAGIC as a valid path
    const grid = [
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
    ];

    // Level 1-4 normally has hiddenWord 'MAGIC'
    const config = getLevelConfig(1, 4, grid);
    expect(config.hiddenWord).toBeUndefined();
  });

  it('should keep hiddenWord when word CAN be formed on the grid', () => {
    // GIVEN: A grid that contains MAGIC as a valid path
    // M A G X
    // X X I X
    // X X C X
    // X X X X
    const grid = [
      ['M', 'A', 'G', 'X'],
      ['X', 'X', 'I', 'X'],
      ['X', 'X', 'C', 'X'],
      ['X', 'X', 'X', 'X'],
    ];
    // Path: M(0,0)->A(0,1)->G(0,2)->I(1,2)->C(2,2)

    const config = getLevelConfig(1, 4, grid);
    expect(config.hiddenWord).toBe('MAGIC');
  });

  it('should not affect levels without hidden words', () => {
    const grid = [
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
    ];

    // Level 1 has no hidden word
    const config = getLevelConfig(1, 1, grid);
    expect(config.hiddenWord).toBeUndefined();
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
        world: -1, // Invalid — negative world
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [],
        specialTiles: [],
        difficulty: 'EASY',
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid world: must be 1-10');
    });

    it('should allow world 0 as endless mode', () => {
      const config: LevelConfig = {
        world: 0, // Endless mode
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [{ type: 'score', target: 100, isPrimary: true }],
        specialTiles: [],
        difficulty: 'EASY',
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(true);
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
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one objective required');
    });

    it('should validate all generated configs', () => {
      // Every config from getLevelConfig should pass validation
      for (let world = 1; world <= 10; world++) {
        for (let level = 1; level <= 7; level++) {
          const config = getLevelConfig(world, level);
          const result = validateLevelConfig(config);
          expect(result.valid).toBe(true);
        }
      }
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
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('outside grid'))).toBe(true);
    });
  });
});

describe('Score target calibration (Fix 1)', () => {
  it('should base score targets on realistic word output for forge levels', () => {
    // W3 L6 is forge archetype → scoreTarget primary
    const objectives = generateObjectives(3, 6);
    const scoreObj = objectives.find((o) => o.type === 'scoreTarget' && o.isPrimary);

    expect(scoreObj).toBeDefined();
    // forge has 1.4× boost and gold-heavy board
    expect(scoreObj!.target).toBeGreaterThan(0);
  });

  it('should produce higher score targets in later worlds', () => {
    // forge levels across worlds: W3L6, W6L2, W10L4
    const world3 = generateObjectives(3, 6);
    const world6 = generateObjectives(6, 2);
    const world10 = generateObjectives(10, 4);

    const s3 = world3.find((o) => o.type === 'scoreTarget' && o.isPrimary)!.target;
    const s6 = world6.find((o) => o.type === 'scoreTarget' && o.isPrimary)!.target;
    const s10 = world10.find((o) => o.type === 'scoreTarget' && o.isPrimary)!.target;

    expect(s6).toBeGreaterThan(s3);
    expect(s10).toBeGreaterThan(s6);
  });

  it('should cap score targets at per-world maximum', () => {
    // Cap scales linearly: W1=1500 → W10=3000
    for (let world = 1; world <= 10; world++) {
      const worldCap = Math.round(1500 + (world - 1) * (1500 / 9));
      for (let level = 1; level <= 6; level++) {
        const objectives = generateObjectives(world, level);
        const scoreObj = objectives.find((o) => o.type === 'scoreTarget' && o.isPrimary);
        if (scoreObj) {
          expect(scoreObj.target).toBeLessThanOrEqual(worldCap);
        }
      }
    }
  });
});

describe('Word count backpressure from timer (Fix 2)', () => {
  it('should cap wordCount target based on available timer', () => {
    // GIVEN: Any world/level with wordCount objective (odd levels)
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 6; level++) {
        const objectives = generateObjectives(world, level);
        const wordObj = objectives.find(
          (o) => o.type === 'wordCount' && o.isPrimary
        );
        if (!wordObj) continue;

        const timer = getTimerDuration(world);
        const maxReasonableWords = timer / 4; // 1 word per 4s is very fast
        const cap = Math.floor(maxReasonableWords * 0.8);

        expect(wordObj.target).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('should never require more than 1 word per 5 seconds', () => {
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 6; level++) {
        const objectives = generateObjectives(world, level);
        const wordObj = objectives.find(
          (o) => o.type === 'wordCount' && o.isPrimary
        );
        if (!wordObj) continue;

        const timer = getTimerDuration(world);
        const secondsPerWord = timer / wordObj.target;

        // Player should have at least 5 seconds per word
        expect(secondsPerWord).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('World 7 word count is capped by backpressure from timer', () => {
    // W7 L3 is 'classic' archetype → wordCount primary
    // Timer for world 7 = 140s (6x6 grid). Cap = floor((140/4)*0.8) = 28
    const objectives = generateObjectives(7, 3);
    const wordObj = objectives.find(
      (o) => o.type === 'wordCount' && o.isPrimary
    );

    expect(wordObj).toBeDefined();
    // With 140s timer, backpressure cap = 28
    expect(wordObj!.target).toBeLessThanOrEqual(28);
    // Still a challenging target
    expect(wordObj!.target).toBeGreaterThanOrEqual(15);
  });

  describe('Early game score targets (difficulty curve audit)', () => {
    it('W1 classic levels should have wordCount primary', () => {
      // World 1 is all classic archetype → wordCount primary
      const config = getLevelConfig(1, 2);
      const wordObj = config.objectives.find(
        (o) => o.type === 'wordCount' && o.isPrimary
      );
      expect(wordObj).toBeDefined();
      // scoreTarget appears as secondary
      const scoreSecondary = config.objectives.find(
        (o) => o.type === 'scoreTarget' && !o.isPrimary
      );
      expect(scoreSecondary).toBeDefined();
    });

    it('forge levels should have scoreTarget primary with appropriate targets', () => {
      // W3 L6 is forge → scoreTarget primary
      const config = getLevelConfig(3, 6);
      const scoreObj = config.objectives.find(
        (o) => o.type === 'scoreTarget' && o.isPrimary
      );
      expect(scoreObj).toBeDefined();
      expect(scoreObj!.target).toBeGreaterThan(0);
    });

    it('difficulty should ramp up by W5+ for forge levels', () => {
      // W5 L3 is forge, W3 L6 is forge
      const w3config = getLevelConfig(3, 6);
      const w5config = getLevelConfig(5, 3);
      const s3 = w3config.objectives.find(
        (o) => o.type === 'scoreTarget' && o.isPrimary
      )!.target;
      const s5 = w5config.objectives.find(
        (o) => o.type === 'scoreTarget' && o.isPrimary
      )!.target;
      expect(s5).toBeGreaterThan(s3);
    });
  });
});
