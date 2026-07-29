/**
 * Game State Module — Zustand store + selector hooks.
 *
 * ```tsx
 * import { useGameActive, useGameActions } from '@/hooks/gameState';
 * const gameActive = useGameActive();
 * const { setGameActive } = useGameActions();
 * ```
 */

// Zustand store (RECOMMENDED)
export { useGameStore } from './store';
export type { GameStore } from './store';

// Selector hooks and actions (split for maintainability)
export {
  useGameActive,
  useLetterGrid,
  useRemainingTime,
  useGameDuration,
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
  useHostSelectedGameMode,
  useWordHuntTargetLength,
  useWordHuntTargetCategory,
  useWordHuntMyLife,
  useWordHuntPlayerLives,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntEliminatedPlayers,
  useBlastTileOverlay,
  useBlastBoardClears,
  useBlastSeed,
  useBlastComboSync,
  useGameActions,
} from './selectors';

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
