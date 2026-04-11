/**
 * Level Archetypes Tests
 *
 * TDD tests for the archetype system that gives each level a distinct gameplay flavor.
 */

import {
  getArchetypeForLevel,
  getArchetypeConfig,
  ARCHETYPE_CONFIGS,
  WORLD_ARCHETYPE_MAPS,
} from '../levelArchetypes';
import type { LevelArchetype } from '@/types/adventure';

describe('Level Archetypes', () => {
  describe('ARCHETYPE_CONFIGS', () => {
    it('should define configs for all 6 archetypes', () => {
      const archetypes: LevelArchetype[] = [
        'classic',
        'blast',
        'hunt',
        'wheel',
        'forge',
        'boss',
      ];
      for (const a of archetypes) {
        expect(ARCHETYPE_CONFIGS[a]).toBeDefined();
      }
    });

    it('blast should have high ice tile count and clearIce primary', () => {
      const config = ARCHETYPE_CONFIGS.blast;
      expect(config.primaryObjective).toBe('clearIce');
      expect(config.tileModifiers.iceMultiplier).toBeGreaterThan(1);
    });

    it('forge should have high gold tile count and scoreTarget primary', () => {
      const config = ARCHETYPE_CONFIGS.forge;
      expect(config.tileModifiers.goldMultiplier).toBeGreaterThan(1);
      expect(config.primaryObjective).toBe('scoreTarget');
    });

    it('hunt should have no ice/bomb tiles and wordCount primary', () => {
      const config = ARCHETYPE_CONFIGS.hunt;
      expect(config.primaryObjective).toBe('wordCount');
      expect(config.tileModifiers.iceMultiplier).toBe(0);
    });

    it('wheel should have shorter timer and wordCount primary', () => {
      const config = ARCHETYPE_CONFIGS.wheel;
      expect(config.timerMultiplier).toBeLessThan(1);
      expect(config.primaryObjective).toBe('wordCount');
    });

    it('blast should have 0 timerMultiplier (move-limited mode)', () => {
      const config = ARCHETYPE_CONFIGS.blast;
      expect(config.timerMultiplier).toBe(0);
    });

    it('hunt should have 0 timerMultiplier (life-based mode)', () => {
      const config = ARCHETYPE_CONFIGS.hunt;
      expect(config.timerMultiplier).toBe(0);
    });

    it('boss should use defeatBoss primary', () => {
      const config = ARCHETYPE_CONFIGS.boss;
      expect(config.primaryObjective).toBe('defeatBoss');
    });

    it('classic should have neutral multipliers', () => {
      const config = ARCHETYPE_CONFIGS.classic;
      expect(config.timerMultiplier).toBe(1);
    });
  });

  describe('WORLD_ARCHETYPE_MAPS', () => {
    it('should define archetype maps for all 10 worlds', () => {
      expect(Object.keys(WORLD_ARCHETYPE_MAPS)).toHaveLength(10);
    });

    it('should have 7 entries per world (one per level)', () => {
      for (let world = 1; world <= 10; world++) {
        expect(WORLD_ARCHETYPE_MAPS[world]).toHaveLength(7);
      }
    });

    it('should always assign boss archetype to level 7', () => {
      for (let world = 1; world <= 10; world++) {
        expect(WORLD_ARCHETYPE_MAPS[world][6]).toBe('boss');
      }
    });

    it('World 1 should be mostly classic (tutorial)', () => {
      const w1 = WORLD_ARCHETYPE_MAPS[1];
      const classicCount = w1.filter((a) => a === 'classic').length;
      expect(classicCount).toBeGreaterThanOrEqual(4);
    });

    it('later worlds should have more archetype variety', () => {
      const w8 = WORLD_ARCHETYPE_MAPS[8];
      const uniqueTypes = new Set(w8);
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(4);
    });

    it('no two consecutive non-boss levels should have the same archetype (worlds 3+)', () => {
      for (let world = 3; world <= 10; world++) {
        const map = WORLD_ARCHETYPE_MAPS[world];
        for (let i = 0; i < 5; i++) {
          // levels 1-6 (skip boss at 7)
          expect(map[i]).not.toBe(map[i + 1]);
        }
      }
    });
  });

  describe('getArchetypeForLevel', () => {
    it('should return the archetype for a given world and level', () => {
      const archetype = getArchetypeForLevel(1, 1);
      expect(archetype).toBe('classic');
    });

    it('should return boss for level 7 of any world', () => {
      for (let world = 1; world <= 10; world++) {
        expect(getArchetypeForLevel(world, 7)).toBe('boss');
      }
    });

    it('should throw for invalid world', () => {
      expect(() => getArchetypeForLevel(0, 1)).toThrow();
      expect(() => getArchetypeForLevel(11, 1)).toThrow();
    });

    it('should throw for invalid level', () => {
      expect(() => getArchetypeForLevel(1, 0)).toThrow();
      expect(() => getArchetypeForLevel(1, 8)).toThrow();
    });
  });

  describe('getArchetypeConfig', () => {
    it('should return full config for a valid archetype', () => {
      const config = getArchetypeConfig('blast');
      expect(config.primaryObjective).toBe('clearIce');
      expect(config.tileModifiers).toBeDefined();
      expect(config.timerMultiplier).toBeDefined();
    });

    it('should return config for all archetype types', () => {
      const types: LevelArchetype[] = [
        'classic', 'blast', 'hunt', 'wheel', 'forge', 'boss',
      ];
      for (const t of types) {
        expect(getArchetypeConfig(t)).toBeDefined();
        expect(getArchetypeConfig(t).description).toBeTruthy();
      }
    });
  });
});
