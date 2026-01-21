/**
 * Single Player State Module
 *
 * Centralized state management for single player mode using Zustand.
 *
 * RECOMMENDED USAGE (best performance):
 * ```tsx
 * import { useSinglePlayerScore, useSinglePlayerActions } from '@/hooks/singlePlayerState';
 * const score = useSinglePlayerScore();
 * const { setScore, addFoundWord } = useSinglePlayerActions();
 * ```
 */

export {
  useSinglePlayerStore,
  // Core state selectors
  useSinglePlayerGrid,
  useSinglePlayerLanguage,
  useSinglePlayerScore,
  useSinglePlayerFoundWords,
  useSinglePlayerPaused,
  useSinglePlayerGameOver,
  useSinglePlayerValidating,
  useSinglePlayerRemainingTime,
  useSinglePlayerTotalTime,
  // UI state selectors
  useSinglePlayerShowQuitConfirm,
  useSinglePlayerShowHintPrompt,
  useSinglePlayerFormedWord,
  useSinglePlayerCurrentFeedback,
  useSinglePlayerComboCoinReward,
  // Reveal state selector
  useSinglePlayerRevealState,
  // Combo state selectors
  useSinglePlayerCombo,
  useSinglePlayerComboLevel,
  useSinglePlayerMaxCombo,
  // Fire/Earthquake selectors
  useSinglePlayerFireRoundActive,
  useSinglePlayerFireRoundRemaining,
  useSinglePlayerEarthquakeState,
  // Bot scores selector
  useSinglePlayerBotScores,
  // Total board words
  useSinglePlayerTotalBoardWords,
  // Actions
  useSinglePlayerActions,
} from './store';

export type {
  SinglePlayerStore,
  SinglePlayerState,
  SinglePlayerActions,
  FoundWord,
  RevealState,
  ComboState,
} from './store';
