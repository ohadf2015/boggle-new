/**
 * useGameState - Re-export from modular implementation
 *
 * This file maintains backward compatibility by re-exporting from the
 * modular gameState/ directory. The hook has been split into focused files:
 * - gameState/types.ts: Type definitions
 * - gameState/reducer.ts: State reducer
 * - gameState/useGameState.ts: Hook implementation
 */

// Re-export types for backward compatibility
export type {
  Player,
  ComboState,
  TournamentData,
  TournamentStanding,
  GameStateValues,
  GameStateAction,
  GameStateActions,
  UseGameStateReturn,
} from './gameState';
