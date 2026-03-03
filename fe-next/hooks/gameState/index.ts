/**
 * Game State Module
 *
 * Centralized game state management powered by Zustand.
 * Split into focused files for maintainability:
 * - types.ts: Type definitions
 * - store.ts: Zustand store with selectors (RECOMMENDED)
 * - reducer.ts: Legacy reducer (kept for reference/testing)
 * - useGameState.ts: Legacy hook (kept for backward compatibility)
 *
 * RECOMMENDED USAGE (Zustand - best performance):
 * ```tsx
 * import { useGameActive, useGameActions } from '@/hooks/gameState';
 * const gameActive = useGameActive();
 * const { setGameActive } = useGameActions();
 * ```
 *
 * LEGACY USAGE (Context - still works):
 * ```tsx
 * import { useGameStateContext } from '@/contexts/GameStateContext';
 * const { gameActive, setGameActive } = useGameStateContext();
 * ```
 */

// Legacy hook (backward compatibility)
export { useGameState } from './useGameState';

// Zustand store and selectors (RECOMMENDED)
export {
  useGameStore,
  useGameActive,
  useLetterGrid,
  useRemainingTime,
  useGameLanguage,
  useMinWordLength,
  useTotalBoardWords,
  usePlayers,
  useLeaderboard,
  useFoundWords,
  useAchievements,
  useWaitingForResults,
  useShowStartAnimation,
  useShufflingGrid,
  useHighlightedCells,
  useCombo,
  useComboLevel,
  useTournamentData,
  useTournamentStandings,
  useShowTournamentStandings,
  useXpGainedData,
  useLevelUpData,
  useBoardTheme,
  useGameMode,
  useGameActions,
} from './store';

export type { GameStore } from './store';

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
