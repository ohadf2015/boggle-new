/**
 * Boss Abilities Hook
 *
 * Manages ability activation, cooldowns, and execution during boss battles.
 * Integrates with attack telegraph system for 2s warning before execution.
 *
 * @example
 * ```tsx
 * const {
 *   abilities,
 *   checkActivation,
 *   startAbility,
 *   executeAbility,
 *   tickCooldowns,
 * } = useBossAbilities('ms-grammar');
 *
 * // Check if any ability can activate
 * const ability = checkActivation(bossContext, bossState);
 * if (ability) {
 *   startAbility(ability.id); // Starts 2s telegraph
 *   // After telegraph completes:
 *   const effects = executeAbility(ability.id);
 * }
 * ```
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { abilityRegistry } from '../lib/adventure/abilities/registry';
import type {
  BossAbility,
  AbilityRuntimeState,
  AbilityEffect,
  UseBossAbilitiesReturn,
  ActivationCondition,
} from '../types/bossAbility';
import type { BossStateMachineContext, BossStateMachineState } from '../types/bossStateMachine';

// ==============================================
// CONDITION CHECKING
// ==============================================

/**
 * Check if an activation condition is met
 *
 * @param condition - The condition to check
 * @param context - Boss state machine context
 * @param state - Current boss state
 * @returns True if condition is met
 */
function checkCondition(
  condition: ActivationCondition,
  context: BossStateMachineContext,
  state: BossStateMachineState
): boolean {
  switch (condition.type) {
    case 'phase': {
      // Phase order for comparison
      const phaseOrder = ['intro', 'phase1', 'phase2', 'enraged', 'victory', 'defeat'];
      const currentIndex = phaseOrder.indexOf(state);
      const targetIndex = phaseOrder.indexOf(condition.value as string);

      // Handle operator-based phase comparison
      if (condition.operator === '>=') return currentIndex >= targetIndex;
      if (condition.operator === '>') return currentIndex > targetIndex;
      if (condition.operator === '<=') return currentIndex <= targetIndex;
      if (condition.operator === '<') return currentIndex < targetIndex;
      // Default: exact match
      return state === condition.value;
    }

    case 'hp_threshold': {
      // Calculate HP percentage
      const hpPercent = (context.hp / context.maxHP) * 100;
      const threshold = condition.value as number;

      // Handle operator-based HP comparison
      if (condition.operator === '<') return hpPercent < threshold;
      if (condition.operator === '<=') return hpPercent <= threshold;
      if (condition.operator === '>') return hpPercent > threshold;
      if (condition.operator === '>=') return hpPercent >= threshold;
      // Default: exact match (rarely used for HP)
      return hpPercent === threshold;
    }

    case 'time_elapsed': {
      const elapsed = context.timeElapsed ?? 0;
      const target = condition.value as number;
      if (condition.operator === '>=') return elapsed >= target;
      if (condition.operator === '>') return elapsed > target;
      if (condition.operator === '<=') return elapsed <= target;
      if (condition.operator === '<') return elapsed < target;
      return elapsed === target;
    }

    case 'words_found': {
      const words = context.wordsFound ?? 0;
      const target = condition.value as number;
      if (condition.operator === '>=') return words >= target;
      if (condition.operator === '>') return words > target;
      if (condition.operator === '<=') return words <= target;
      if (condition.operator === '<') return words < target;
      return words === target;
    }

    case 'combo_count': {
      const combo = context.comboCount ?? 0;
      const target = condition.value as number;
      if (condition.operator === '>=') return combo >= target;
      if (condition.operator === '>') return combo > target;
      if (condition.operator === '<=') return combo <= target;
      if (condition.operator === '<') return combo < target;
      return combo === target;
    }

    default:
      return false;
  }
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for managing boss abilities during battle
 *
 * Provides ability lifecycle management:
 * - Check if abilities can activate based on conditions
 * - Start ability telegraph (2s warning)
 * - Execute ability effects and start cooldown
 * - Tick cooldowns over time
 *
 * @param bossId - The boss identifier
 * @returns Ability management functions and state
 */
export function useBossAbilities(bossId: string): UseBossAbilitiesReturn {
  // Get abilities for this boss from registry
  const abilities = useMemo(
    () => abilityRegistry.getForBoss(bossId),
    [bossId]
  );

  // Initialize runtime state for each ability
  const [abilityStates, setAbilityStates] = useState<Map<string, AbilityRuntimeState>>(
    () => {
      const states = new Map<string, AbilityRuntimeState>();
      abilities.forEach((ability) => {
        states.set(ability.id, {
          abilityId: ability.id,
          cooldownRemaining: 0,
          isTelegraphing: false,
          useCount: 0,
          lastActivatedAt: null,
        });
      });
      return states;
    }
  );

  // Currently telegraphing ability
  const [telegraphingAbility, setTelegraphingAbility] = useState<BossAbility | null>(null);

  // Ref for abilities to avoid stale closures
  const abilitiesRef = useRef(abilities);
  useEffect(() => {
    abilitiesRef.current = abilities;
  }, [abilities]);

  /**
   * Check if any ability can activate based on current context
   *
   * Checks abilities in priority order and returns the first one
   * that has all conditions met and is not on cooldown.
   *
   * @param context - Boss state machine context
   * @param state - Current boss state
   * @returns The ability that can activate, or null
   */
  const checkActivation = useCallback(
    (context: BossStateMachineContext, state: BossStateMachineState): BossAbility | null => {
      // Don't check if already telegraphing
      if (telegraphingAbility) return null;

      // Check abilities in priority order (already sorted by registry)
      for (const ability of abilitiesRef.current) {
        const runtimeState = abilityStates.get(ability.id);

        // Skip if on cooldown
        if (runtimeState && runtimeState.cooldownRemaining > 0) {
          continue;
        }

        // Check all activation conditions
        const allConditionsMet = ability.activationConditions.every((condition) =>
          checkCondition(condition, context, state)
        );

        if (allConditionsMet) {
          return ability;
        }
      }

      return null;
    },
    [abilityStates, telegraphingAbility]
  );

  /**
   * Start ability telegraph
   *
   * Sets the ability as telegraphing, which triggers visual warning.
   * The actual execution happens after telegraph duration.
   *
   * @param abilityId - ID of ability to telegraph
   */
  const startAbility = useCallback((abilityId: string) => {
    const ability = abilityRegistry.get(abilityId);
    if (!ability) return;

    setTelegraphingAbility(ability);
    setAbilityStates((prev) => {
      const next = new Map(prev);
      const state = next.get(abilityId);
      if (state) {
        next.set(abilityId, { ...state, isTelegraphing: true });
      }
      return next;
    });
  }, []);

  /**
   * Execute ability effects and start cooldown
   *
   * Called after telegraph completes to apply the ability effects.
   * Puts ability on cooldown and updates usage stats.
   *
   * @param abilityId - ID of ability to execute
   * @returns Array of effects to apply
   */
  const executeAbility = useCallback((abilityId: string): AbilityEffect[] => {
    const ability = abilityRegistry.get(abilityId);
    if (!ability) return [];

    // Update runtime state
    setAbilityStates((prev) => {
      const next = new Map(prev);
      const state = next.get(abilityId);
      if (state) {
        next.set(abilityId, {
          ...state,
          isTelegraphing: false,
          cooldownRemaining: ability.cooldown * 1000, // Convert to ms
          useCount: state.useCount + 1,
          lastActivatedAt: Date.now(),
        });
      }
      return next;
    });

    // Clear telegraphing state
    setTelegraphingAbility(null);

    return ability.effects;
  }, []);

  /**
   * Tick cooldowns by delta time
   *
   * Should be called every frame or at regular intervals to
   * decrement ability cooldowns.
   *
   * @param deltaMs - Time elapsed in milliseconds
   */
  const tickCooldowns = useCallback((deltaMs: number) => {
    setAbilityStates((prev) => {
      let hasChanges = false;
      const next = new Map(prev);

      for (const [id, state] of next) {
        if (state.cooldownRemaining > 0) {
          hasChanges = true;
          next.set(id, {
            ...state,
            cooldownRemaining: Math.max(0, state.cooldownRemaining - deltaMs),
          });
        }
      }

      // Only return new map if something changed (optimization)
      return hasChanges ? next : prev;
    });
  }, []);

  /**
   * Reset all ability states
   *
   * Called when starting a new battle to clear cooldowns
   * and usage stats.
   */
  const resetAbilities = useCallback(() => {
    setAbilityStates(() => {
      const states = new Map<string, AbilityRuntimeState>();
      abilitiesRef.current.forEach((ability) => {
        states.set(ability.id, {
          abilityId: ability.id,
          cooldownRemaining: 0,
          isTelegraphing: false,
          useCount: 0,
          lastActivatedAt: null,
        });
      });
      return states;
    });
    setTelegraphingAbility(null);
  }, []);

  return {
    abilities,
    abilityStates,
    telegraphingAbility,
    checkActivation,
    startAbility,
    executeAbility,
    tickCooldowns,
    resetAbilities,
  };
}
