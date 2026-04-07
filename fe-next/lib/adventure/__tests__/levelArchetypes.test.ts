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
    it('should define configs for all 7 archetypes', () => {
      const archetypes: LevelArchetype[] = [
        'standard',
        'excavation',
        'goldRush',
        'puzzle',
        'survival',
        'cascade',
        'boss',
      ];
      for (const a of archetypes) {
        expect(ARCHETYPE_CONFIGS[a]).toBeDefined();
      }
    });

    it('excavation should have high ice tile count and clearIce primary', () => {
      const config = ARCHETYPE_CONFIGS.excavation;
      expect(config.primaryObjective).toBe('clearIce');
      expect(config.tileModifiers.iceMultiplier).toBeGreaterThan(1);
    });

    it('goldRush should have short timer and gold-heavy tiles', () => {
      const config = ARCHETYPE_CONFIGS.goldRush;
      expect(config.timerMultiplier).toBeLessThan(1);
      expect(config.tileModifiers.goldMultiplier).toBeGreaterThan(1);
      expect(config.primaryObjective).toBe('scoreTarget');
    });

    it('puzzle should have longWords primary and no ice', () => {
      const config = ARCHETYPE_CONFIGS.puzzle;
      expect(config.primaryObjective).toBe('longWords');
      expect(config.tileModifiers.iceMultiplier).toBe(0);
    });

    it('survival should have fast timer drain and time tile emphasis', () => {
      const config = ARCHETYPE_CONFIGS.survival;
      expect(config.timerMultiplier).toBeLessThan(1);
      expect(config.tileModifiers.timeMultiplier).toBeGreaterThan(1);
      expect(config.primaryObjective).toBe('timeBonus');
    });

    it('cascade should have chain tile emphasis and wordCount primary', () => {
      const config = ARCHETYPE_CONFIGS.cascade;
      expect(config.tileModifiers.chainMultiplier).toBeGreaterThan(1);
      expect(config.primaryObjective).toBe('wordCount');
    });

    it('boss should use defeatBoss primary', () => {
      const config = ARCHETYPE_CONFIGS.boss;
      expect(config.primaryObjective).toBe('defeatBoss');
    });

    it('standard should have neutral multipliers', () => {
      const config = ARCHETYPE_CONFIGS.standard;
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

    it('World 1 should be mostly standard (tutorial)', () => {
      const w1 = WORLD_ARCHETYPE_MAPS[1];
      const standardCount = w1.filter((a) => a === 'standard').length;
      expect(standardCount).toBeGreaterThanOrEqual(4);
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
      expect(archetype).toBe('standard');
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
      const config = getArchetypeConfig('excavation');
      expect(config.primaryObjective).toBe('clearIce');
      expect(config.tileModifiers).toBeDefined();
      expect(config.timerMultiplier).toBeDefined();
    });

    it('should return config for all archetype types', () => {
      const types: LevelArchetype[] = [
        'standard', 'excavation', 'goldRush', 'puzzle', 'survival', 'cascade', 'boss',
      ];
      for (const t of types) {
        expect(getArchetypeConfig(t)).toBeDefined();
        expect(getArchetypeConfig(t).description).toBeTruthy();
      }
    });
  });
});
