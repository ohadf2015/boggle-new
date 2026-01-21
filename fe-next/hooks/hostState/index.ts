/**
 * Host View State Module
 *
 * Centralized state management for host view mode using Zustand.
 *
 * RECOMMENDED USAGE (best performance):
 * ```tsx
 * import { useHostGameStarted, useHostActions } from '@/hooks/hostState';
 * const gameStarted = useHostGameStarted();
 * const { setGameStarted, setPlayersReady } = useHostActions();
 * ```
 */

export {
  useHostStore,
  // Settings selectors
  useHostDifficulty,
  useHostMinWordLength,
  useHostTimerValue,
  useHostPlaying,
  useHostGameType,
  useHostTournamentRounds,
  useHostRoomLanguage,
  // Runtime selectors
  useHostGameStarted,
  useHostTableData,
  useHostRemainingTime,
  useHostWaitingForResults,
  useHostShowStartAnimation,
  // Player selectors
  useHostPlayersReady,
  useHostPlayerWordCounts,
  useHostPlayerScores,
  useHostPlayerAchievements,
  // Host playing selectors
  useHostFoundWords,
  useHostAchievements,
  // Tournament selectors
  useHostTournamentData,
  useHostTournamentCreating,
  useHostFinalScores,
  // Animation selectors
  useHostShufflingGrid,
  useHostHighlightedCells,
  // UI selectors
  useHostShowQR,
  useHostShowExitConfirm,
  useHostShowCancelTournamentDialog,
  // Combo selectors
  useHostComboLevel,
  useHostLastWordTime,
  // XP selectors
  useHostXpGainedData,
  useHostLevelUpData,
  // Board selectors
  useHostWordsForBoard,
  useHostBoardTheme,
  // Grouped selectors
  useHostSettings,
  useHostRuntime,
  useHostPlayers,
  useHostTournament,
  useHostUI,
  // Actions
  useHostActions,
} from './store';

export type {
  HostStore,
  HostState,
  HostActions,
  TournamentData,
  FinalScoresData,
  XpGainedData,
  LevelUpData,
} from './store';
