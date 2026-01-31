/**
 * useBossStateMachine Hook
 *
 * XState 5-phase state machine for boss battles:
 * intro -> phase1 -> phase2 -> enraged -> victory/defeat
 *
 * Phase transitions at HP thresholds:
 * - phase1 -> phase2: HP drops below 66%
 * - phase2 -> enraged: HP drops below 33%
 * - any active state -> victory: HP reaches 0
 * - any active state -> defeat: timer expires
 */

'use client';

import { useCallback, useMemo } from 'react';
import { setup, assign } from 'xstate';
import { useMachine } from '@xstate/react';
import {
  BOSS_PHASE_THRESHOLDS,
  type BossStateMachineContext,
  type BossStateMachineEvent,
  type BossStateMachineState,
  type UseBossStateMachineReturn,
} from '../types/bossStateMachine';

// ==============================================
// TYPES
// ==============================================

interface UseBossStateMachineProps {
  /** Maximum HP for this boss battle */
  maxHP: number;
  /** Boss ID for ability lookup */
  bossId: string;
}

// ==============================================
// HELPERS
// ==============================================

/**
 * Calculate HP percentage (0-100)
 */
function calculateHpPercentage(hp: number, maxHP: number): number {
  if (maxHP === 0) return 0;
  return Math.round((hp / maxHP) * 100);
}

/**
 * Check if HP percentage is below threshold for phase2
 */
function shouldTransitionToPhase2(hp: number, maxHP: number): boolean {
  const hpPercentage = calculateHpPercentage(hp, maxHP);
  return hpPercentage < BOSS_PHASE_THRESHOLDS.PHASE2_THRESHOLD;
}

/**
 * Check if HP percentage is below threshold for enraged
 */
function shouldTransitionToEnraged(hp: number, maxHP: number): boolean {
  const hpPercentage = calculateHpPercentage(hp, maxHP);
  return hpPercentage < BOSS_PHASE_THRESHOLDS.ENRAGED_THRESHOLD;
}

// ==============================================
// STATE MACHINE FACTORY
// ==============================================

/**
 * Create the boss battle state machine
 */
function createBossMachine(initialContext: BossStateMachineContext) {
  return setup({
    types: {
      context: {} as BossStateMachineContext,
      events: {} as BossStateMachineEvent,
    },
    actions: {
      dealDamage: assign(({ context, event }) => {
        if (event.type !== 'DEAL_DAMAGE') return {};
        const damage = Math.max(0, event.amount);
        return {
          hp: Math.max(0, context.hp - damage),
          totalDamageDealt: context.totalDamageDealt + damage,
        };
      }),
      resetState: assign(({ context }) => ({
        hp: context.maxHP,
        totalDamageDealt: 0,
      })),
    },
    guards: {
      isDefeated: ({ context, event }) => {
        if (event.type !== 'DEAL_DAMAGE') return false;
        const damage = Math.max(0, event.amount);
        return context.hp - damage <= 0;
      },
      shouldEnterEnraged: ({ context, event }) => {
        if (event.type !== 'DEAL_DAMAGE') return false;
        const damage = Math.max(0, event.amount);
        const newHp = Math.max(0, context.hp - damage);
        return shouldTransitionToEnraged(newHp, context.maxHP);
      },
      shouldEnterPhase2: ({ context, event }) => {
        if (event.type !== 'DEAL_DAMAGE') return false;
        const damage = Math.max(0, event.amount);
        const newHp = Math.max(0, context.hp - damage);
        return shouldTransitionToPhase2(newHp, context.maxHP);
      },
    },
  }).createMachine({
    id: 'boss',
    initial: 'intro' as BossStateMachineState,
    context: initialContext,
    states: {
      intro: {
        on: {
          START_BATTLE: {
            target: 'phase1',
          },
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
      phase1: {
        on: {
          DEAL_DAMAGE: [
            {
              // Victory takes precedence (one-shot kill)
              target: 'victory',
              guard: 'isDefeated',
              actions: 'dealDamage',
            },
            {
              // Skip to enraged if damage takes HP below 33%
              target: 'enraged',
              guard: 'shouldEnterEnraged',
              actions: 'dealDamage',
            },
            {
              // Transition to phase2 if HP drops below 66%
              target: 'phase2',
              guard: 'shouldEnterPhase2',
              actions: 'dealDamage',
            },
            {
              // Stay in phase1
              actions: 'dealDamage',
            },
          ],
          TIMER_EXPIRED: {
            target: 'defeat',
          },
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
      phase2: {
        on: {
          DEAL_DAMAGE: [
            {
              // Victory takes precedence
              target: 'victory',
              guard: 'isDefeated',
              actions: 'dealDamage',
            },
            {
              // Transition to enraged if HP drops below 33%
              target: 'enraged',
              guard: 'shouldEnterEnraged',
              actions: 'dealDamage',
            },
            {
              // Stay in phase2
              actions: 'dealDamage',
            },
          ],
          TIMER_EXPIRED: {
            target: 'defeat',
          },
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
      enraged: {
        on: {
          DEAL_DAMAGE: [
            {
              // Victory when HP reaches 0
              target: 'victory',
              guard: 'isDefeated',
              actions: 'dealDamage',
            },
            {
              // Stay in enraged
              actions: 'dealDamage',
            },
          ],
          TIMER_EXPIRED: {
            target: 'defeat',
          },
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
      victory: {
        // Final state - only RESET allowed
        on: {
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
      defeat: {
        // Final state - only RESET allowed
        on: {
          RESET: {
            target: 'intro',
            actions: 'resetState',
          },
        },
      },
    },
  });
}

// ==============================================
// HOOK
// ==============================================

/**
 * React hook for boss battle state machine
 *
 * @param props - Configuration props
 * @returns State machine state and control functions
 *
 * @example
 * const { state, context, dealDamage, startBattle, reset } = useBossStateMachine({
 *   maxHP: 1000,
 *   bossId: 'lexicon-dragon'
 * });
 */
export function useBossStateMachine({
  maxHP,
  bossId,
}: UseBossStateMachineProps): UseBossStateMachineReturn {
  // Create initial context
  const initialContext: BossStateMachineContext = useMemo(() => ({
    hp: maxHP,
    maxHP,
    totalDamageDealt: 0,
    bossId,
  }), [maxHP, bossId]);

  // Create machine with initial context
  const machine = useMemo(
    () => createBossMachine(initialContext),
    [initialContext]
  );

  // Use the machine
  const [state, send] = useMachine(machine);

  // Current state value
  const currentState = state.value as BossStateMachineState;

  // Current context
  const context = state.context;

  // HP percentage calculation
  const hpPercentage = useMemo(
    () => calculateHpPercentage(context.hp, context.maxHP),
    [context.hp, context.maxHP]
  );

  // Computed state flags
  const isActive = useMemo(
    () => currentState === 'phase1' || currentState === 'phase2' || currentState === 'enraged',
    [currentState]
  );

  const isEnraged = useMemo(
    () => currentState === 'enraged',
    [currentState]
  );

  const isVictory = useMemo(
    () => currentState === 'victory',
    [currentState]
  );

  const isDefeat = useMemo(
    () => currentState === 'defeat',
    [currentState]
  );

  // Action callbacks
  const startBattle = useCallback(() => {
    send({ type: 'START_BATTLE' });
  }, [send]);

  const dealDamage = useCallback((amount: number) => {
    send({ type: 'DEAL_DAMAGE', amount });
  }, [send]);

  const timerExpired = useCallback(() => {
    send({ type: 'TIMER_EXPIRED' });
  }, [send]);

  const reset = useCallback(() => {
    send({ type: 'RESET' });
  }, [send]);

  return {
    state: currentState,
    context,
    send,
    startBattle,
    dealDamage,
    timerExpired,
    reset,
    hpPercentage,
    isActive,
    isEnraged,
    isVictory,
    isDefeat,
  };
}
