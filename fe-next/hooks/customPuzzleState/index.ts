/**
 * Custom Puzzle State Module
 *
 * Centralized state management for custom puzzle mode using Zustand.
 *
 * RECOMMENDED USAGE (best performance):
 * ```tsx
 * import { useCustomPuzzlePhase, useCustomPuzzleActions } from '@/hooks/customPuzzleState';
 * const phase = useCustomPuzzlePhase();
 * const { setPhase, setPuzzle } = useCustomPuzzleActions();
 * ```
 */

export {
  useCustomPuzzleStore,
  // Core state selectors
  useCustomPuzzlePhase,
  useCustomPuzzlePuzzle,
  useCustomPuzzleError,
  // Game result selector
  useCustomPuzzleGameResult,
  // Leaderboard selectors
  useCustomPuzzleLeaderboard,
  useCustomPuzzlePlayerRank,
  useCustomPuzzleBeatCreator,
  // Actions
  useCustomPuzzleActions,
} from './store';

export type {
  CustomPuzzleStore,
  CustomPuzzleState,
  CustomPuzzleActions,
  CustomPuzzleData,
  CustomPuzzlePhase,
  LeaderboardEntry,
} from './store';
