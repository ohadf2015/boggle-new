/**
 * Game State Module
 *
 * Centralized game state management using useReducer pattern.
 * Split into focused files for maintainability:
 * - types.ts: Type definitions
 * - reducer.ts: State reducer and initial state
 * - useGameState.ts: Main hook implementation
 */

export { useGameState } from './useGameState';

// Re-export types for consumers
export type {
  Player,
  ComboState,
  TournamentData,
  TournamentStanding,
  GameStateValues,
  GameStateAction,
  GameStateActions,
  UseGameStateReturn,
} from './types';

// Re-export reducer utilities for testing
export { gameStateReducer, INITIAL_STATE, DEFAULT_COMBO_STATE } from './reducer';
