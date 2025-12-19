/**
 * Game State Machine
 *
 * Provides type-safe state transitions for game lifecycle.
 * Prevents invalid state transitions like 'waiting' -> 'finished'.
 *
 * State Flow:
 *   waiting -> inProgress -> finished -> validating -> waiting
 *                                    \-> waiting (skip validation)
 */

import { createMachine, assign } from 'xstate';

// ==========================================
// Event Types
// ==========================================

export type GameEvent =
  | { type: 'START'; timerSeconds: number; difficulty?: string }
  | { type: 'END' }
  | { type: 'TIMEOUT' }
  | { type: 'VALIDATE' }
  | { type: 'VALIDATION_COMPLETE' }
  | { type: 'SKIP_VALIDATION' }
  | { type: 'RESET' };

// ==========================================
// Context Types
// ==========================================

export interface GameMachineContext {
  gameCode: string;
  timerSeconds: number;
  startedAt: number | null;
  endedAt: number | null;
  roundNumber: number;
}

// ==========================================
// State Types
// ==========================================

export type GameStateValue = 'waiting' | 'inProgress' | 'finished' | 'validating';

// String values used in game state storage
export type GameStateString = 'waiting' | 'in-progress' | 'finished' | 'validating';

// ==========================================
// State Machine Definition
// ==========================================

export const gameMachine = createMachine({
  id: 'game',
  initial: 'waiting',
  context: {
    gameCode: '',
    timerSeconds: 180,
    startedAt: null,
    endedAt: null,
    roundNumber: 0,
  } as GameMachineContext,
  states: {
    waiting: {
      description: 'Lobby state - players can join, host configures settings',
      on: {
        START: {
          target: 'inProgress',
          actions: assign({
            timerSeconds: ({ event }) => event.timerSeconds,
            startedAt: () => Date.now(),
            endedAt: () => null,
            roundNumber: ({ context }) => context.roundNumber + 1,
          }),
        },
      },
    },
    inProgress: {
      description: 'Game is active - players submit words, timer is running',
      on: {
        END: {
          target: 'finished',
          actions: assign({
            endedAt: () => Date.now(),
          }),
        },
        TIMEOUT: {
          target: 'finished',
          actions: assign({
            endedAt: () => Date.now(),
          }),
        },
      },
    },
    finished: {
      description: 'Round ended - calculating scores, showing results',
      on: {
        VALIDATE: {
          target: 'validating',
        },
        SKIP_VALIDATION: {
          target: 'waiting',
          actions: assign({
            startedAt: () => null,
            endedAt: () => null,
          }),
        },
        RESET: {
          target: 'waiting',
          actions: assign({
            startedAt: () => null,
            endedAt: () => null,
          }),
        },
      },
    },
    validating: {
      description: 'AI/peer validation in progress',
      on: {
        VALIDATION_COMPLETE: {
          target: 'waiting',
          actions: assign({
            startedAt: () => null,
            endedAt: () => null,
          }),
        },
      },
    },
  },
});

// ==========================================
// Helper Functions
// ==========================================

/**
 * Convert machine state value to game state string (for storage)
 */
export function toGameStateString(state: GameStateValue): GameStateString {
  const mapping: Record<GameStateValue, GameStateString> = {
    waiting: 'waiting',
    inProgress: 'in-progress',
    finished: 'finished',
    validating: 'validating',
  };
  return mapping[state];
}

/**
 * Convert game state string to machine state value
 */
export function fromGameStateString(stateString: GameStateString): GameStateValue {
  const mapping: Record<GameStateString, GameStateValue> = {
    'waiting': 'waiting',
    'in-progress': 'inProgress',
    'finished': 'finished',
    'validating': 'validating',
  };
  return mapping[stateString];
}

/**
 * Get valid transitions from a given state
 */
export function getValidTransitions(currentState: GameStateValue): string[] {
  const transitions: Record<GameStateValue, string[]> = {
    waiting: ['START'],
    inProgress: ['END', 'TIMEOUT'],
    finished: ['VALIDATE', 'SKIP_VALIDATION', 'RESET'],
    validating: ['VALIDATION_COMPLETE'],
  };
  return transitions[currentState];
}

/**
 * Check if a transition is valid from the current state
 */
export function isValidTransition(currentState: GameStateValue, eventType: string): boolean {
  return getValidTransitions(currentState).includes(eventType);
}

// ==========================================
// Types Export
// ==========================================

export type GameMachine = typeof gameMachine;
