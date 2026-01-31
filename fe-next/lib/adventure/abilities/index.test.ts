/**
 * Boss Abilities Index Tests
 *
 * Verifies all boss abilities are correctly registered.
 */

import { abilityRegistry, BossAbilityRegistry } from './registry';
import {
  registerAllAbilities,
  ALL_BOSS_ABILITIES,
  getAbilityCount,
  msGrammarAbilities,
  spellingBeeAbilities,
  professorThesaurusAbilities,
  captainMetaphorAbilities,
  baronBuildawordAbilities,
  puzzleMasterAbilities,
  reflectionKingAbilities,
  cosmicWordsmithAbilities,
  linguistSageAbilities,
  lexiconDragonAbilities,
} from './index';

describe('Boss Abilities Index', () => {
  beforeEach(() => {
    // Clear registry before each test
    abilityRegistry.clear();
  });

  describe('ALL_BOSS_ABILITIES', () => {
    it('should contain 24 total abilities', () => {
      expect(ALL_BOSS_ABILITIES.length).toBe(24);
    });

    it('should have unique IDs for all abilities', () => {
      const ids = ALL_BOSS_ABILITIES.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getAbilityCount', () => {
    it('should return 24', () => {
      expect(getAbilityCount()).toBe(24);
    });
  });

  describe('registerAllAbilities', () => {
    it('should register all 24 abilities to the registry', () => {
      registerAllAbilities();
      expect(abilityRegistry.getAll().length).toBe(24);
    });

    it('should be safe to call multiple times', () => {
      registerAllAbilities();
      registerAllAbilities();
      expect(abilityRegistry.getAll().length).toBe(24);
    });
  });

  describe('Boss ability counts', () => {
    const bossAbilityCounts = [
      { bossId: 'msGrammar', expected: 3, abilities: msGrammarAbilities },
      { bossId: 'spellingBee', expected: 2, abilities: spellingBeeAbilities },
      { bossId: 'professorThesaurus', expected: 3, abilities: professorThesaurusAbilities },
      { bossId: 'captainMetaphor', expected: 2, abilities: captainMetaphorAbilities },
      { bossId: 'baronBuildaword', expected: 2, abilities: baronBuildawordAbilities },
      { bossId: 'puzzleMaster', expected: 3, abilities: puzzleMasterAbilities },
      { bossId: 'reflectionKing', expected: 2, abilities: reflectionKingAbilities },
      { bossId: 'cosmicWordsmith', expected: 2, abilities: cosmicWordsmithAbilities },
      { bossId: 'linguistSage', expected: 2, abilities: linguistSageAbilities },
      { bossId: 'lexiconDragon', expected: 3, abilities: lexiconDragonAbilities },
    ];

    it.each(bossAbilityCounts)(
      '$bossId should have $expected abilities',
      ({ bossId, expected, abilities }) => {
        expect(abilities.length).toBe(expected);
        abilities.forEach((ability) => {
          expect(ability.bossId).toBe(bossId);
        });
      }
    );
  });

  describe('Registry integration', () => {
    beforeEach(() => {
      registerAllAbilities();
    });

    it('should retrieve abilities by boss ID', () => {
      const msGrammar = abilityRegistry.getForBoss('msGrammar');
      expect(msGrammar.length).toBe(3);
    });

    it('should retrieve abilities sorted by priority', () => {
      const msGrammar = abilityRegistry.getForBoss('msGrammar');
      // Sorted highest priority first
      expect(msGrammar[0].priority).toBeGreaterThanOrEqual(msGrammar[1].priority);
      expect(msGrammar[1].priority).toBeGreaterThanOrEqual(msGrammar[2].priority);
    });

    it('should retrieve specific ability by ID', () => {
      const popQuiz = abilityRegistry.get('grammar-pop-quiz');
      expect(popQuiz).toBeDefined();
      expect(popQuiz?.name).toBe('adventure.bosses.abilities.popQuiz.name');
    });

    it('should have all 10 bosses represented', () => {
      const bossIds = [
        'msGrammar', 'spellingBee', 'professorThesaurus',
        'captainMetaphor', 'baronBuildaword', 'puzzleMaster', 'reflectionKing',
        'cosmicWordsmith', 'linguistSage', 'lexiconDragon',
      ];

      bossIds.forEach((bossId) => {
        const abilities = abilityRegistry.getForBoss(bossId);
        expect(abilities.length).toBeGreaterThanOrEqual(2);
        expect(abilities.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Ability structure validation', () => {
    it('should have valid translation keys for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.name).toMatch(/^adventure\.bosses\.abilities\.\w+\.name$/);
        expect(ability.description).toMatch(/^adventure\.bosses\.abilities\.\w+\.desc$/);
      });
    });

    it('should have positive cooldowns for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.cooldown).toBeGreaterThan(0);
      });
    });

    it('should have telegraph duration of 2000ms for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.telegraph.duration).toBe(2000);
      });
    });

    it('should have at least one effect for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.effects.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should have at least one activation condition for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.activationConditions.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should have positive priority for all abilities', () => {
      ALL_BOSS_ABILITIES.forEach((ability) => {
        expect(ability.priority).toBeGreaterThan(0);
      });
    });
  });
});
