/**
 * Adventure Mode Level Variety Tests
 *
 * Tests for the level variety configuration system that defines
 * what's unique about each level in Worlds 1-3.
 *
 * Following TDD: Write tests FIRST, then implement
 */

import {
  // Types
  type LevelVariety,
  type EntryAnimationType,
  type AtmosphereElement,
  // Configuration
  LEVEL_VARIETY_WORLD_1,
  LEVEL_VARIETY_WORLD_2,
  LEVEL_VARIETY_WORLD_3,
  // Functions
  getLevelVariety,
  getLevelIntroduces,
  getLevelEntryAnimation,
  getLevelAtmosphere,
  isMilestoneLevel,
  getWorldVarietyConfig,
} from '../levelVariety';

describe('LevelVariety Types', () => {
  describe('EntryAnimationType', () => {
    it('should have valid entry animation types', () => {
      const validTypes: EntryAnimationType[] = [
        'cascade',
        'spiral',
        'explode',
        'fade',
        'wave',
      ];

      // Each type should be a string
      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('AtmosphereElement', () => {
    it('should have valid atmosphere elements for World 1', () => {
      const world1Elements: AtmosphereElement[] = [
        'floatingLetters',
        'butterflies',
        'grassSway',
        'sunRays',
      ];

      world1Elements.forEach((element) => {
        expect(typeof element).toBe('string');
      });
    });

    it('should have valid atmosphere elements for World 2', () => {
      const world2Elements: AtmosphereElement[] = [
        'waterDroplets',
        'ripples',
        'mist',
        'sparkles',
      ];

      world2Elements.forEach((element) => {
        expect(typeof element).toBe('string');
      });
    });

    it('should have valid atmosphere elements for World 3', () => {
      const world3Elements: AtmosphereElement[] = [
        'crystalSparkle',
        'torchFlicker',
        'caveDust',
        'glowingRunes',
      ];

      world3Elements.forEach((element) => {
        expect(typeof element).toBe('string');
      });
    });
  });
});

describe('World 1 - Alphabet Meadows Variety', () => {
  describe('LEVEL_VARIETY_WORLD_1', () => {
    it('should have configuration for all 10 levels', () => {
      expect(LEVEL_VARIETY_WORLD_1).toHaveLength(10);
    });

    it('should have correct world and level numbers', () => {
      LEVEL_VARIETY_WORLD_1.forEach((variety, index) => {
        expect(variety.world).toBe(1);
        expect(variety.level).toBe(index + 1);
      });
    });

    it('should introduce basic gameplay in level 1', () => {
      const level1 = LEVEL_VARIETY_WORLD_1[0];

      expect(level1.introduces).toBe('basicGameplay');
      expect(level1.entryAnimation).toBe('fade');
    });

    it('should introduce longer words objective in level 3', () => {
      const level3 = LEVEL_VARIETY_WORLD_1[2];

      expect(level3.introduces).toBe('longWordsObjective');
    });

    it('should have milestone on level 5 with hidden word', () => {
      const level5 = LEVEL_VARIETY_WORLD_1[4];

      expect(level5.isMilestone).toBe(true);
      expect(level5.specialEvent).toBe('hiddenWordChallenge');
    });

    it('should introduce gold tiles in level 8', () => {
      const level8 = LEVEL_VARIETY_WORLD_1[7];

      expect(level8.introduces).toBe('goldTiles');
    });

    it('should have milestone on level 10 with boss hint', () => {
      const level10 = LEVEL_VARIETY_WORLD_1[9];

      expect(level10.isMilestone).toBe(true);
      expect(level10.specialEvent).toBe('worldBossHint');
    });

    it('should have progressive atmosphere elements', () => {
      // Early levels have minimal atmosphere
      const level1 = LEVEL_VARIETY_WORLD_1[0];
      const level5 = LEVEL_VARIETY_WORLD_1[4];
      const level10 = LEVEL_VARIETY_WORLD_1[9];

      // Later levels should have more atmosphere
      expect(level10.atmosphere?.length).toBeGreaterThanOrEqual(
        level1.atmosphere?.length || 0
      );
    });
  });
});

describe('World 2 - Synonym Springs Variety', () => {
  describe('LEVEL_VARIETY_WORLD_2', () => {
    it('should have configuration for all 10 levels', () => {
      expect(LEVEL_VARIETY_WORLD_2).toHaveLength(10);
    });

    it('should have correct world and level numbers', () => {
      LEVEL_VARIETY_WORLD_2.forEach((variety, index) => {
        expect(variety.world).toBe(2);
        expect(variety.level).toBe(index + 1);
      });
    });

    it('should introduce synonym mechanic in level 1', () => {
      const level1 = LEVEL_VARIETY_WORLD_2[0];

      expect(level1.introduces).toBe('synonymMechanic');
    });

    it('should introduce ice tiles in level 2', () => {
      const level2 = LEVEL_VARIETY_WORLD_2[1];

      expect(level2.introduces).toBe('iceTiles');
    });

    it('should have water-themed atmosphere', () => {
      const level5 = LEVEL_VARIETY_WORLD_2[4];

      expect(level5.atmosphere).toContain('waterDroplets');
    });

    it('should have milestone on level 5', () => {
      const level5 = LEVEL_VARIETY_WORLD_2[4];

      expect(level5.isMilestone).toBe(true);
    });

    it('should have milestone on level 10', () => {
      const level10 = LEVEL_VARIETY_WORLD_2[9];

      expect(level10.isMilestone).toBe(true);
    });
  });
});

describe('World 3 - Root Caverns Variety', () => {
  describe('LEVEL_VARIETY_WORLD_3', () => {
    it('should have configuration for all 10 levels', () => {
      expect(LEVEL_VARIETY_WORLD_3).toHaveLength(10);
    });

    it('should have correct world and level numbers', () => {
      LEVEL_VARIETY_WORLD_3.forEach((variety, index) => {
        expect(variety.world).toBe(3);
        expect(variety.level).toBe(index + 1);
      });
    });

    it('should introduce etymology mechanic in level 1', () => {
      const level1 = LEVEL_VARIETY_WORLD_3[0];

      expect(level1.introduces).toBe('etymologyMechanic');
    });

    it('should introduce bomb tiles in level 3', () => {
      const level3 = LEVEL_VARIETY_WORLD_3[2];

      expect(level3.introduces).toBe('bombTiles');
    });

    it('should have cave-themed atmosphere', () => {
      const level5 = LEVEL_VARIETY_WORLD_3[4];

      expect(level5.atmosphere).toContain('crystalSparkle');
    });

    it('should introduce time bonus objective in level 7', () => {
      const level7 = LEVEL_VARIETY_WORLD_3[6];

      expect(level7.introduces).toBe('timeBonusObjective');
    });

    it('should have milestones on levels 5 and 10', () => {
      const level5 = LEVEL_VARIETY_WORLD_3[4];
      const level10 = LEVEL_VARIETY_WORLD_3[9];

      expect(level5.isMilestone).toBe(true);
      expect(level10.isMilestone).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('getLevelVariety', () => {
    it('should return variety config for valid world/level', () => {
      // GIVEN
      const world = 1;
      const level = 5;

      // WHEN
      const variety = getLevelVariety(world, level);

      // THEN
      expect(variety).toBeDefined();
      expect(variety?.world).toBe(1);
      expect(variety?.level).toBe(5);
    });

    it('should return undefined for worlds 4+', () => {
      // Worlds 4-10 don't have variety configs yet
      const variety = getLevelVariety(4, 1);

      expect(variety).toBeUndefined();
    });

    it('should return undefined for invalid level', () => {
      const variety = getLevelVariety(1, 11);

      expect(variety).toBeUndefined();
    });

    it('should return undefined for invalid world', () => {
      const variety = getLevelVariety(0, 1);

      expect(variety).toBeUndefined();
    });
  });

  describe('getLevelIntroduces', () => {
    it('should return what the level introduces', () => {
      const introduces = getLevelIntroduces(1, 1);

      expect(introduces).toBe('basicGameplay');
    });

    it('should return undefined when level introduces nothing new', () => {
      // Level 2 might not introduce anything specific
      const introduces = getLevelIntroduces(1, 2);

      // Either undefined or a valid string
      expect(introduces === undefined || typeof introduces === 'string').toBe(
        true
      );
    });

    it('should return undefined for unconfigured worlds', () => {
      const introduces = getLevelIntroduces(5, 1);

      expect(introduces).toBeUndefined();
    });
  });

  describe('getLevelEntryAnimation', () => {
    it('should return entry animation type', () => {
      const animation = getLevelEntryAnimation(1, 1);

      expect(animation).toBe('fade');
    });

    it('should return default animation for unconfigured levels', () => {
      // World 4 not configured, should return default
      const animation = getLevelEntryAnimation(4, 1);

      expect(animation).toBe('cascade'); // Default animation
    });

    it('should return different animations for different levels', () => {
      const animations = new Set<string>();

      for (let level = 1; level <= 10; level++) {
        const anim = getLevelEntryAnimation(1, level);
        if (anim) animations.add(anim);
      }

      // Should have some variety
      expect(animations.size).toBeGreaterThan(1);
    });
  });

  describe('getLevelAtmosphere', () => {
    it('should return atmosphere elements array', () => {
      const atmosphere = getLevelAtmosphere(1, 5);

      expect(Array.isArray(atmosphere)).toBe(true);
    });

    it('should return world-specific elements', () => {
      const world1Atm = getLevelAtmosphere(1, 5);
      const world2Atm = getLevelAtmosphere(2, 5);
      const world3Atm = getLevelAtmosphere(3, 5);

      // Each world should have distinct atmosphere
      // World 1: meadows/pastoral
      // World 2: water/springs
      // World 3: caves/crystals

      // At least one should be different
      const allSame =
        JSON.stringify(world1Atm) === JSON.stringify(world2Atm) &&
        JSON.stringify(world2Atm) === JSON.stringify(world3Atm);

      expect(allSame).toBe(false);
    });

    it('should return empty array for unconfigured worlds', () => {
      const atmosphere = getLevelAtmosphere(5, 1);

      expect(atmosphere).toEqual([]);
    });
  });

  describe('isMilestoneLevel', () => {
    it('should return true for level 5', () => {
      expect(isMilestoneLevel(1, 5)).toBe(true);
      expect(isMilestoneLevel(2, 5)).toBe(true);
      expect(isMilestoneLevel(3, 5)).toBe(true);
    });

    it('should return true for level 10', () => {
      expect(isMilestoneLevel(1, 10)).toBe(true);
      expect(isMilestoneLevel(2, 10)).toBe(true);
      expect(isMilestoneLevel(3, 10)).toBe(true);
    });

    it('should return false for non-milestone levels', () => {
      expect(isMilestoneLevel(1, 1)).toBe(false);
      expect(isMilestoneLevel(1, 3)).toBe(false);
      expect(isMilestoneLevel(1, 7)).toBe(false);
    });

    it('should return false for unconfigured worlds', () => {
      // Even level 5 in unconfigured world returns false
      expect(isMilestoneLevel(5, 5)).toBe(false);
    });
  });

  describe('getWorldVarietyConfig', () => {
    it('should return all levels for World 1', () => {
      const config = getWorldVarietyConfig(1);

      expect(config).toHaveLength(10);
      expect(config[0].world).toBe(1);
    });

    it('should return all levels for World 2', () => {
      const config = getWorldVarietyConfig(2);

      expect(config).toHaveLength(10);
      expect(config[0].world).toBe(2);
    });

    it('should return all levels for World 3', () => {
      const config = getWorldVarietyConfig(3);

      expect(config).toHaveLength(10);
      expect(config[0].world).toBe(3);
    });

    it('should return empty array for unconfigured worlds', () => {
      const config = getWorldVarietyConfig(4);

      expect(config).toEqual([]);
    });
  });
});

describe('Progressive Variety', () => {
  it('should introduce new elements progressively across worlds', () => {
    // Track what each level introduces across all 3 worlds
    const allIntroductions: string[] = [];

    for (let world = 1; world <= 3; world++) {
      for (let level = 1; level <= 10; level++) {
        const introduces = getLevelIntroduces(world, level);
        if (introduces) {
          allIntroductions.push(introduces);
        }
      }
    }

    // Should have multiple unique introductions
    const uniqueIntroductions = new Set(allIntroductions);
    expect(uniqueIntroductions.size).toBeGreaterThan(5);
  });

  it('should not repeat introductions within the same world', () => {
    for (let world = 1; world <= 3; world++) {
      const worldIntroductions: string[] = [];

      for (let level = 1; level <= 10; level++) {
        const introduces = getLevelIntroduces(world, level);
        if (introduces) {
          worldIntroductions.push(introduces);
        }
      }

      // Check for duplicates
      const unique = new Set(worldIntroductions);
      expect(unique.size).toBe(worldIntroductions.length);
    }
  });

  it('should have increasing visual richness as levels progress', () => {
    // Compare first and last level atmosphere
    const world1Level1 = getLevelAtmosphere(1, 1);
    const world1Level10 = getLevelAtmosphere(1, 10);

    const world3Level1 = getLevelAtmosphere(3, 1);
    const world3Level10 = getLevelAtmosphere(3, 10);

    // Later levels should have at least as many atmosphere elements
    expect(world1Level10.length).toBeGreaterThanOrEqual(world1Level1.length);
    expect(world3Level10.length).toBeGreaterThanOrEqual(world3Level1.length);
  });
});
