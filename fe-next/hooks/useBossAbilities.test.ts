/**
 * useBossAbilities Hook Tests
 *
 * Tests ability lifecycle: activation checks, telegraph, execution, cooldowns.
 */

import { renderHook, act } from '@testing-library/react';
import { useBossAbilities } from './useBossAbilities';
import { abilityRegistry } from '../lib/adventure/abilities/registry';
import type { BossAbility } from '../types/bossAbility';
import type { BossStateMachineContext } from '../types/bossStateMachine';

describe('useBossAbilities', () => {
  // Using existing translation keys to avoid translation checker warnings
  const mockAbility: BossAbility = {
    id: 'pop-quiz',
    bossId: 'ms-grammar',
    name: 'adventure.bosses.msGrammar.name',
    description: 'adventure.bosses.msGrammar.mechanic',
    cooldown: 30,
    activationConditions: [{ type: 'phase', value: 'phase1' }],
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
    activationConditions: [{ type: 'hp_threshold', value: 50, operator: '<' }],
    effects: [{ type: 'scramble', target: { type: 'all' } }],
    telegraph: { duration: 2000, visualType: 'tiles' },
    priority: 20,
    interruptible: false,
  };

  const createContext = (overrides?: Partial<BossStateMachineContext>): BossStateMachineContext => ({
    hp: 1000,
    maxHP: 1000,
    totalDamageDealt: 0,
    bossId: 'ms-grammar',
    ...overrides,
  });

  beforeEach(() => {
    abilityRegistry.clear();
    abilityRegistry.register(mockAbility);
    abilityRegistry.register(mockAbility2);
  });

  afterEach(() => {
    abilityRegistry.clear();
  });

  describe('Initial State', () => {
    it('should return abilities for the boss', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      expect(result.current.abilities).toHaveLength(2);
    });

    it('should return empty array for boss with no abilities', () => {
      const { result } = renderHook(() => useBossAbilities('unknown-boss'));
      expect(result.current.abilities).toHaveLength(0);
    });

    it('should initialize ability states with 0 cooldown', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.cooldownRemaining).toBe(0);
    });

    it('should initialize ability states with 0 use count', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.useCount).toBe(0);
    });

    it('should initialize ability states with isTelegraphing false', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.isTelegraphing).toBe(false);
    });

    it('should initialize ability states with lastActivatedAt null', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.lastActivatedAt).toBeNull();
    });

    it('should not have telegraphing ability initially', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      expect(result.current.telegraphingAbility).toBeNull();
    });
  });

  describe('checkActivation', () => {
    it('should return ability when phase condition is met', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext();
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability?.id).toBe('pop-quiz');
    });

    it('should return null when phase condition is not met', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext();
      const ability = result.current.checkActivation(context, 'intro');
      expect(ability).toBeNull();
    });

    it('should check HP threshold conditions', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      // HP is 40% (below 50% threshold)
      const context = createContext({ hp: 400 });
      const ability = result.current.checkActivation(context, 'phase2');
      // grammar-storm has higher priority and HP condition is met
      expect(ability?.id).toBe('grammar-storm');
    });

    it('should return higher priority ability when multiple conditions met', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      // HP is 40%, phase is phase1 - both abilities conditions met
      const context = createContext({ hp: 400 });
      const ability = result.current.checkActivation(context, 'phase1');
      // grammar-storm has priority 20, pop-quiz has priority 10
      expect(ability?.id).toBe('grammar-storm');
    });

    it('should skip abilities on cooldown', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      // Execute ability to put on cooldown
      act(() => {
        result.current.startAbility('pop-quiz');
        result.current.executeAbility('pop-quiz');
      });

      const context = createContext();
      const ability = result.current.checkActivation(context, 'phase1');
      // pop-quiz is on cooldown, no other ability meets conditions
      expect(ability).toBeNull();
    });

    it('should return null when already telegraphing', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
      });

      const context = createContext({ hp: 400 });
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability).toBeNull();
    });
  });

  describe('startAbility', () => {
    it('should set telegraphing ability', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
      });

      expect(result.current.telegraphingAbility?.id).toBe('pop-quiz');
    });

    it('should set isTelegraphing state', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.isTelegraphing).toBe(true);
    });

    it('should not throw for non-existent ability', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      expect(() => {
        act(() => {
          result.current.startAbility('non-existent');
        });
      }).not.toThrow();
    });
  });

  describe('executeAbility', () => {
    it('should return ability effects', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
      });

      let effects: ReturnType<typeof result.current.executeAbility>;
      act(() => {
        effects = result.current.executeAbility('pop-quiz');
      });

      expect(effects!).toHaveLength(1);
      expect(effects![0].type).toBe('requirement');
    });

    it('should start cooldown', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
        result.current.executeAbility('pop-quiz');
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.cooldownRemaining).toBe(30000); // 30 seconds in ms
    });

    it('should increment use count', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.useCount).toBe(1);
    });

    it('should set lastActivatedAt', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const beforeExecute = Date.now();

      act(() => {
        result.current.executeAbility('pop-quiz');
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.lastActivatedAt).toBeGreaterThanOrEqual(beforeExecute);
    });

    it('should clear telegraphing state', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
        result.current.executeAbility('pop-quiz');
      });

      expect(result.current.telegraphingAbility).toBeNull();
      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.isTelegraphing).toBe(false);
    });

    it('should return empty array for non-existent ability', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      let effects: ReturnType<typeof result.current.executeAbility>;
      act(() => {
        effects = result.current.executeAbility('non-existent');
      });

      expect(effects!).toEqual([]);
    });
  });

  describe('tickCooldowns', () => {
    it('should reduce cooldown over time', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
      });

      act(() => {
        result.current.tickCooldowns(5000); // 5 seconds
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.cooldownRemaining).toBe(25000); // 30000 - 5000
    });

    it('should not go below 0', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
      });

      act(() => {
        result.current.tickCooldowns(50000); // More than 30s cooldown
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.cooldownRemaining).toBe(0);
    });

    it('should not affect abilities with 0 cooldown', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const stateBefore = result.current.abilityStates.get('pop-quiz');

      act(() => {
        result.current.tickCooldowns(5000);
      });

      const stateAfter = result.current.abilityStates.get('pop-quiz');
      expect(stateAfter?.cooldownRemaining).toBe(stateBefore?.cooldownRemaining);
    });
  });

  describe('resetAbilities', () => {
    it('should reset all cooldowns to 0', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
        result.current.resetAbilities();
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.cooldownRemaining).toBe(0);
    });

    it('should reset use counts', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
        result.current.executeAbility('pop-quiz');
        result.current.resetAbilities();
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.useCount).toBe(0);
    });

    it('should clear telegraphing ability', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
        result.current.resetAbilities();
      });

      expect(result.current.telegraphingAbility).toBeNull();
    });

    it('should clear isTelegraphing state', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.startAbility('pop-quiz');
        result.current.resetAbilities();
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.isTelegraphing).toBe(false);
    });

    it('should reset lastActivatedAt to null', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));

      act(() => {
        result.current.executeAbility('pop-quiz');
        result.current.resetAbilities();
      });

      const state = result.current.abilityStates.get('pop-quiz');
      expect(state?.lastActivatedAt).toBeNull();
    });
  });

  describe('Phase Condition Operators', () => {
    const phaseAbility: BossAbility = {
      ...mockAbility,
      id: 'phase-test',
      activationConditions: [{ type: 'phase', value: 'phase2', operator: '>=' }],
    };

    beforeEach(() => {
      abilityRegistry.clear();
      abilityRegistry.register(phaseAbility);
    });

    it('should activate with >= operator when current phase is greater', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext();
      const ability = result.current.checkActivation(context, 'enraged');
      expect(ability?.id).toBe('phase-test');
    });

    it('should activate with >= operator when current phase is equal', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext();
      const ability = result.current.checkActivation(context, 'phase2');
      expect(ability?.id).toBe('phase-test');
    });

    it('should not activate with >= operator when current phase is less', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext();
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability).toBeNull();
    });
  });

  describe('HP Threshold Condition Operators', () => {
    const hpAbility: BossAbility = {
      ...mockAbility,
      id: 'hp-test',
      activationConditions: [{ type: 'hp_threshold', value: 60, operator: '<=' }],
    };

    beforeEach(() => {
      abilityRegistry.clear();
      abilityRegistry.register(hpAbility);
    });

    it('should activate with <= operator when HP is less', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext({ hp: 500, maxHP: 1000 }); // 50%
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability?.id).toBe('hp-test');
    });

    it('should activate with <= operator when HP is equal', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext({ hp: 600, maxHP: 1000 }); // 60%
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability?.id).toBe('hp-test');
    });

    it('should not activate with <= operator when HP is greater', () => {
      const { result } = renderHook(() => useBossAbilities('ms-grammar'));
      const context = createContext({ hp: 700, maxHP: 1000 }); // 70%
      const ability = result.current.checkActivation(context, 'phase1');
      expect(ability).toBeNull();
    });
  });
});
