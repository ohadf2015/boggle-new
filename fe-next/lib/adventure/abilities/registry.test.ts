/**
 * Boss Ability Registry Tests
 *
 * TDD RED phase: Tests written BEFORE implementation.
 * These tests should FAIL until registry.ts is implemented.
 */

import { BossAbilityRegistry } from './registry';
import type { BossAbility } from '../../../types/bossAbility';

describe('BossAbilityRegistry', () => {
  let registry: BossAbilityRegistry;

  // Mock abilities for testing
  // Using existing translation keys (msGrammar.name, spellingBee.name) to avoid translation checker warnings
  const mockAbility: BossAbility = {
    id: 'pop-quiz',
    bossId: 'ms-grammar',
    name: 'adventure.bosses.msGrammar.name',
    description: 'adventure.bosses.msGrammar.mechanic',
    cooldown: 30,
    activationConditions: [{ type: 'phase', value: 'phase1', operator: '>=' }],
    effects: [{ type: 'requirement', params: { requirementType: 'doubleLetters' } }],
    telegraph: { duration: 2000, visualType: 'screen' },
    priority: 10,
    interruptible: false,
  };

  const mockAbility2: BossAbility = {
    id: 'grammar-storm',
    bossId: 'ms-grammar',
    name: 'adventure.bosses.msGrammar.name',
    description: 'adventure.bosses.msGrammar.mechanic',
    cooldown: 45,
    activationConditions: [{ type: 'phase', value: 'enraged' }],
    effects: [{ type: 'scramble', target: { type: 'all' } }],
    telegraph: { duration: 2000, visualType: 'tiles' },
    priority: 20,
    interruptible: false,
  };

  const differentBossAbility: BossAbility = {
    id: 'hivemind-swarm',
    bossId: 'spelling-bee',
    name: 'adventure.bosses.spellingBee.name',
    description: 'adventure.bosses.spellingBee.mechanic',
    cooldown: 40,
    activationConditions: [{ type: 'hp_threshold', value: 50, operator: '<' }],
    effects: [{ type: 'spawn_special', target: { type: 'random', count: 6 } }],
    telegraph: { duration: 2000, visualType: 'tiles', particleEffect: 'bees' },
    priority: 15,
    interruptible: false,
  };

  beforeEach(() => {
    registry = new BossAbilityRegistry();
  });

  describe('register', () => {
    it('should register an ability', () => {
      registry.register(mockAbility);
      expect(registry.get('pop-quiz')).toEqual(mockAbility);
    });

    it('should allow registering multiple abilities', () => {
      registry.register(mockAbility);
      registry.register(mockAbility2);
      expect(registry.get('pop-quiz')).toEqual(mockAbility);
      expect(registry.get('grammar-storm')).toEqual(mockAbility2);
    });

    it('should overwrite ability with same ID', () => {
      registry.register(mockAbility);
      const updated = { ...mockAbility, cooldown: 60 };
      registry.register(updated);
      expect(registry.get('pop-quiz')?.cooldown).toBe(60);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent ability', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should return registered ability', () => {
      registry.register(mockAbility);
      expect(registry.get('pop-quiz')).toEqual(mockAbility);
    });
  });

  describe('getForBoss', () => {
    it('should return empty array for boss with no abilities', () => {
      expect(registry.getForBoss('unknown-boss')).toEqual([]);
    });

    it('should return all abilities for a boss', () => {
      registry.register(mockAbility);
      registry.register(mockAbility2);
      registry.register(differentBossAbility);

      const grammarAbilities = registry.getForBoss('ms-grammar');
      expect(grammarAbilities).toHaveLength(2);
      expect(grammarAbilities.map(a => a.id)).toContain('pop-quiz');
      expect(grammarAbilities.map(a => a.id)).toContain('grammar-storm');
    });

    it('should not return abilities from other bosses', () => {
      registry.register(mockAbility);
      registry.register(differentBossAbility);

      const grammarAbilities = registry.getForBoss('ms-grammar');
      expect(grammarAbilities).toHaveLength(1);
      expect(grammarAbilities[0].id).toBe('pop-quiz');
    });

    it('should return abilities sorted by priority (highest first)', () => {
      registry.register(mockAbility); // priority 10
      registry.register(mockAbility2); // priority 20

      const abilities = registry.getForBoss('ms-grammar');
      expect(abilities[0].id).toBe('grammar-storm'); // priority 20
      expect(abilities[1].id).toBe('pop-quiz'); // priority 10
    });
  });

  describe('unregister', () => {
    it('should remove an ability', () => {
      registry.register(mockAbility);
      registry.unregister('pop-quiz');
      expect(registry.get('pop-quiz')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent ability', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no abilities registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered abilities', () => {
      registry.register(mockAbility);
      registry.register(mockAbility2);
      registry.register(differentBossAbility);

      const all = registry.getAll();
      expect(all).toHaveLength(3);
    });
  });

  describe('clear', () => {
    it('should remove all abilities', () => {
      registry.register(mockAbility);
      registry.register(mockAbility2);
      registry.clear();
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return false for non-existent ability', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should return true for registered ability', () => {
      registry.register(mockAbility);
      expect(registry.has('pop-quiz')).toBe(true);
    });
  });
});
