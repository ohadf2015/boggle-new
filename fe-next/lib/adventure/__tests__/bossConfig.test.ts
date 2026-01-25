/**
 * Boss Configuration Tests
 *
 * Tests for boss configuration, retrieval, and taunt functions.
 * TDD: Written BEFORE implementation (RED phase).
 */

import {
  BOSS_CONFIGS,
  getBossConfig,
  getBossTaunt,
  getBossImagePath,
  getAllBossConfigs,
} from '../bossConfig';
import { BOSS_TWIST_TYPES, type BossTauntEvent, type BossConfig } from '@/types/boss';
import { WORLDS_COUNT } from '../constants';

describe('Boss Configuration', () => {
  describe('BOSS_CONFIGS', () => {
    it('should have a boss config for each of the 10 worlds', () => {
      for (let world = 1; world <= WORLDS_COUNT; world++) {
        expect(BOSS_CONFIGS[world]).toBeDefined();
      }
    });

    it('should have unique boss IDs', () => {
      const ids = Object.values(BOSS_CONFIGS).map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have matching worldId for each config key', () => {
      for (const [key, config] of Object.entries(BOSS_CONFIGS)) {
        expect(config.worldId).toBe(Number(key));
      }
    });

    it('should have valid twist mechanic type for each boss', () => {
      for (const config of Object.values(BOSS_CONFIGS)) {
        expect(BOSS_TWIST_TYPES).toContain(config.twistMechanic.type);
      }
    });

    it('should have unique twist mechanic types (one per boss)', () => {
      const types = Object.values(BOSS_CONFIGS).map(
        (b) => b.twistMechanic.type
      );
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it('should have valid image paths for each boss', () => {
      for (const config of Object.values(BOSS_CONFIGS)) {
        expect(config.imagePath).toMatch(
          /^\/images\/adventure\/bosses\/.+\.webp$/
        );
      }
    });

    it('should have non-empty taunts for each boss', () => {
      for (const config of Object.values(BOSS_CONFIGS)) {
        expect(config.taunts.onStart.length).toBeGreaterThan(0);
        expect(config.taunts.onGoodWord.length).toBeGreaterThan(0);
        expect(config.taunts.onBadWord.length).toBeGreaterThan(0);
        expect(config.taunts.onMechanic.length).toBeGreaterThan(0);
        expect(config.taunts.onLowTime.length).toBeGreaterThan(0);
        expect(config.taunts.onVictory).toBeTruthy();
        expect(config.taunts.onDefeat).toBeTruthy();
      }
    });

    it('should have non-empty displayName for each boss', () => {
      for (const config of Object.values(BOSS_CONFIGS)) {
        expect(config.displayName).toBeTruthy();
        expect(config.displayName).toContain('adventure.bosses.');
      }
    });

    it('should have non-empty personality for each boss', () => {
      for (const config of Object.values(BOSS_CONFIGS)) {
        expect(config.personality).toBeTruthy();
        expect(config.personality.length).toBeGreaterThan(10);
      }
    });
  });

  describe('getBossConfig', () => {
    it('should return the correct boss for each world', () => {
      const expectedIds = [
        'msGrammar',
        'spellingBee',
        'professorThesaurus',
        'captainMetaphor',
        'baronBuildaword',
        'puzzleMaster',
        'reflectionKing',
        'cosmicWordsmith',
        'linguistSage',
        'lexiconDragon',
      ];

      for (let world = 1; world <= WORLDS_COUNT; world++) {
        const boss = getBossConfig(world);
        expect(boss).not.toBeNull();
        expect(boss!.id).toBe(expectedIds[world - 1]);
      }
    });

    it('should return null for invalid world numbers', () => {
      expect(getBossConfig(0)).toBeNull();
      expect(getBossConfig(-1)).toBeNull();
      expect(getBossConfig(11)).toBeNull();
      expect(getBossConfig(100)).toBeNull();
    });
  });

  describe('getBossTaunt', () => {
    it('should return a taunt string for valid events with array taunts', () => {
      const arrayEvents: BossTauntEvent[] = [
        'onStart',
        'onGoodWord',
        'onBadWord',
        'onMechanic',
        'onLowTime',
      ];

      for (const event of arrayEvents) {
        const taunt = getBossTaunt(1, event);
        expect(taunt).toBeTruthy();
        expect(typeof taunt).toBe('string');
      }
    });

    it('should return a taunt string for victory/defeat events', () => {
      const victoryTaunt = getBossTaunt(1, 'onVictory');
      expect(victoryTaunt).toBeTruthy();

      const defeatTaunt = getBossTaunt(1, 'onDefeat');
      expect(defeatTaunt).toBeTruthy();
    });

    it('should return empty string for invalid world', () => {
      expect(getBossTaunt(0, 'onStart')).toBe('');
      expect(getBossTaunt(11, 'onStart')).toBe('');
    });
  });

  describe('getBossImagePath', () => {
    it('should return the correct image path for each world', () => {
      for (let world = 1; world <= WORLDS_COUNT; world++) {
        const path = getBossImagePath(world);
        expect(path).toMatch(/^\/images\/adventure\/bosses\/.+\.webp$/);
      }
    });

    it('should return empty string for invalid world', () => {
      expect(getBossImagePath(0)).toBe('');
      expect(getBossImagePath(11)).toBe('');
    });
  });

  describe('getAllBossConfigs', () => {
    it('should return all 10 boss configs', () => {
      const configs = getAllBossConfigs();
      expect(configs).toHaveLength(10);
    });

    it('should return configs ordered by worldId', () => {
      const configs = getAllBossConfigs();
      for (let i = 0; i < configs.length; i++) {
        expect(configs[i].worldId).toBe(i + 1);
      }
    });

    it('should return a new array (not a reference to internal data)', () => {
      const configs1 = getAllBossConfigs();
      const configs2 = getAllBossConfigs();
      expect(configs1).not.toBe(configs2);
      expect(configs1).toEqual(configs2);
    });
  });

  describe('Boss-specific configs', () => {
    it('World 1 - Ms. Grammar should have popQuiz mechanic', () => {
      const boss = getBossConfig(1) as BossConfig;
      expect(boss.id).toBe('msGrammar');
      expect(boss.twistMechanic.type).toBe('popQuiz');
      expect(boss.twistMechanic.params).toHaveProperty('requirementTypes');
    });

    it('World 2 - Spelling Bee should have hiveMind mechanic', () => {
      const boss = getBossConfig(2) as BossConfig;
      expect(boss.id).toBe('spellingBee');
      expect(boss.twistMechanic.type).toBe('hiveMind');
    });

    it('World 3 - Professor Thesaurus should have etymologyDig mechanic', () => {
      const boss = getBossConfig(3) as BossConfig;
      expect(boss.id).toBe('professorThesaurus');
      expect(boss.twistMechanic.type).toBe('etymologyDig');
    });

    it('World 4 - Captain Metaphor should have idiomBattle mechanic', () => {
      const boss = getBossConfig(4) as BossConfig;
      expect(boss.id).toBe('captainMetaphor');
      expect(boss.twistMechanic.type).toBe('idiomBattle');
    });

    it('World 5 - Baron Buildaword should have assemblyLine mechanic', () => {
      const boss = getBossConfig(5) as BossConfig;
      expect(boss.id).toBe('baronBuildaword');
      expect(boss.twistMechanic.type).toBe('assemblyLine');
    });

    it('World 6 - Puzzle Master should have scrambledReality mechanic', () => {
      const boss = getBossConfig(6) as BossConfig;
      expect(boss.id).toBe('puzzleMaster');
      expect(boss.twistMechanic.type).toBe('scrambledReality');
    });

    it('World 7 - Reflection King should have mirrorMatch mechanic', () => {
      const boss = getBossConfig(7) as BossConfig;
      expect(boss.id).toBe('reflectionKing');
      expect(boss.twistMechanic.type).toBe('mirrorMatch');
    });

    it('World 8 - Cosmic Wordsmith should have stellarForge mechanic', () => {
      const boss = getBossConfig(8) as BossConfig;
      expect(boss.id).toBe('cosmicWordsmith');
      expect(boss.twistMechanic.type).toBe('stellarForge');
    });

    it('World 9 - Linguist Sage should have babelSummit mechanic', () => {
      const boss = getBossConfig(9) as BossConfig;
      expect(boss.id).toBe('linguistSage');
      expect(boss.twistMechanic.type).toBe('babelSummit');
    });

    it('World 10 - Lexicon Dragon should have finalWord mechanic', () => {
      const boss = getBossConfig(10) as BossConfig;
      expect(boss.id).toBe('lexiconDragon');
      expect(boss.twistMechanic.type).toBe('finalWord');
    });
  });
});
