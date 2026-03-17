/**
 * Game State Machine Utility
 *
 * Provides safe state transitions for game lifecycle.
 * This is a lightweight implementation that mirrors the XState machine
 * in shared/stateMachines/gameMachine.ts for use in CommonJS backend code.
 *
 * Usage:
 *   import { canTransition, transition, getValidEvents, isInProgress } from './gameStateMachine';
 *
 *   // Check if transition is valid
 *   if (canTransition('waiting', 'START')) {
 *     const result = transition('waiting', 'START');
 *   }
 *
 *   // Check current state
 *   if (isInProgress(game.gameState)) {
 *     // game is active
 *   }
 */

import type { GameState, Game } from '@/shared/types';

// ==========================================
// Type Definitions
// ==========================================

type MachineState = 'waiting' | 'inProgress' | 'finished' | 'validating';
type EventType = 'START' | 'END' | 'TIMEOUT' | 'VALIDATE' | 'SKIP_VALIDATION' | 'RESET' | 'VALIDATION_COMPLETE';

interface TransitionResult {
  success: boolean;
  newState: GameState | null;
  error?: string;
}

// ==========================================
// State Mappings
// ==========================================

// Map between storage strings and machine states
const STATE_TO_MACHINE: Record<GameState, MachineState> = {
  'waiting': 'waiting',
  'in-progress': 'inProgress',
  'finished': 'finished',
  'validating': 'validating',
};

const MACHINE_TO_STATE: Record<MachineState, GameState> = {
  'waiting': 'waiting',
  'inProgress': 'in-progress',
  'finished': 'finished',
  'validating': 'validating',
};

// Valid transitions from each state
const VALID_TRANSITIONS: Record<MachineState, EventType[]> = {
  'waiting': ['START'],
  'inProgress': ['END', 'TIMEOUT'],
  'finished': ['END', 'VALIDATE', 'SKIP_VALIDATION', 'RESET'],
  'validating': ['VALIDATION_COMPLETE'],
};

// Target states for each transition
const TRANSITION_TARGETS: Record<MachineState, Partial<Record<EventType, GameState>>> = {
  'waiting': {
    'START': 'in-progress',
  },
  'inProgress': {
    'END': 'finished',
    'TIMEOUT': 'finished',
  },
  'finished': {
    'END': 'finished', // Idempotent: already finished, stay finished
    'VALIDATE': 'validating',
    'SKIP_VALIDATION': 'waiting',
    'RESET': 'waiting',
  },
  'validating': {
    'VALIDATION_COMPLETE': 'waiting',
  },
};

// ==========================================
// Core Functions
// ==========================================

/**
 * Convert storage state string to machine state
 */
export function toMachineState(stateString: GameState): MachineState {
  return STATE_TO_MACHINE[stateString] || 'waiting';
}

/**
 * Convert machine state to storage state string
 */
export function toStorageState(machineState: MachineState): GameState {
  return MACHINE_TO_STATE[machineState] || 'waiting';
}

/**
 * Check if a transition is valid from the current state
 */
export function canTransition(currentState: GameState, eventType: EventType): boolean {
  const machineState = toMachineState(currentState);
  const validEvents = VALID_TRANSITIONS[machineState] || [];
  return validEvents.includes(eventType);
}

/**
 * Get the target state for a transition
 */
export function getTransitionTarget(currentState: GameState, eventType: EventType): GameState | null {
  const machineState = toMachineState(currentState);
  const targets = TRANSITION_TARGETS[machineState];
  if (!targets || !targets[eventType]) {
    return null;
  }
  return targets[eventType] || null;
}

/**
 * Perform a state transition
 */
export function transition(currentState: GameState, eventType: EventType): TransitionResult {
  if (!canTransition(currentState, eventType)) {
    return {
      success: false,
      newState: null,
      error: `Invalid transition: ${currentState} -> ${eventType}`,
    };
  }

  const newState = getTransitionTarget(currentState, eventType);
  return {
    success: true,
    newState,
  };
}

/**
 * Get valid events from the current state
 */
export function getValidEvents(currentState: GameState): EventType[] {
  const machineState = toMachineState(currentState);
  return VALID_TRANSITIONS[machineState] || [];
}

/**
 * Get all possible states
 */
export function getAllStates(): GameState[] {
  return ['waiting', 'in-progress', 'finished', 'validating'];
}

/**
 * Validate that a state string is valid
 */
export function isValidState(state: string): state is GameState {
  return getAllStates().includes(state as GameState);
}

// ==========================================
// State Check Helpers
// ==========================================

/**
 * Check if game is in waiting state (lobby)
 */
export function isWaiting(state: GameState): boolean {
  return state === 'waiting';
}

/**
 * Check if game is in progress (active play)
 */
export function isInProgress(state: GameState): boolean {
  return state === 'in-progress';
}

/**
 * Check if game is finished (results phase)
 */
export function isFinished(state: GameState): boolean {
  return state === 'finished';
}

/**
 * Check if game is in validation phase
 */
export function isValidating(state: GameState): boolean {
  return state === 'validating';
}

/**
 * Check if game can accept word submissions (only during active play)
 */
export function canSubmitWords(state: GameState): boolean {
  return isInProgress(state);
}

/**
 * Check if game can be started (only from waiting state)
 */
export function canStartGame(state: GameState): boolean {
  return isWaiting(state);
}

/**
 * Check if players can freely join (not ranked in-progress)
 */
export function canJoinFreely(game: Game | null): boolean {
  if (!game) return false;
  if (isWaiting(game.gameState)) return true;
  if (isInProgress(game.gameState) && !game.isRanked) return true;
  if (isInProgress(game.gameState) && game.allowLateJoin) return true;
  return false;
}

/**
 * Check if late join should send game state to player
 */
export function shouldSendGameState(state: GameState): boolean {
  return isInProgress(state);
}

export type { GameState, MachineState, EventType, TransitionResult };
