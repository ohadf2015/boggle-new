/**
 * Custom Puzzle Game State Store (Zustand)
 *
 * Centralized state management for custom puzzle mode with selective subscriptions.
 * Components only re-render when the specific state they subscribe to changes.
 *
 * USAGE:
 * ```tsx
 * // Subscribe to specific state (recommended - best performance)
 * const phase = useCustomPuzzlePhase();
 * const puzzle = useCustomPuzzlePuzzle();
 * const { setPhase, setPuzzle } = useCustomPuzzleActions();
 * ```
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { SurvivalGameResult } from '@/components/daily/survival';

// ==========================================
// Type Definitions
// ==========================================

export interface CustomPuzzleData {
  id: string;
  puzzleCode: string;
  creatorDisplayName: string;
  language: Language;
  targetWord: string;
  grid: LetterGrid;
  creatorSolved: boolean;
  creatorAttemptsUsed: number;
  creatorEfficiencyScore: number;
  totalPlays: number;
}

export interface LeaderboardEntry {
  displayName: string;
  rank: number;
  solved: boolean;
  attemptsUsed: number;
  efficiencyScore: number;
  isCreator?: boolean;
}

export type CustomPuzzlePhase = 'loading' | 'intro' | 'playing' | 'results';

export interface CustomPuzzleState {
  // Core state
  phase: CustomPuzzlePhase;
  puzzle: CustomPuzzleData | null;
  error: string | null;

  // Game result
  gameResult: SurvivalGameResult | null;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  beatCreator: boolean;
}

export interface CustomPuzzleActions {
  // Core setters
  setPhase: (phase: CustomPuzzlePhase) => void;
  setPuzzle: (puzzle: CustomPuzzleData | null) => void;
  setError: (error: string | null) => void;

  // Game result setters
  setGameResult: (result: SurvivalGameResult | null) => void;

  // Leaderboard setters
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setPlayerRank: (rank: number | null) => void;
  setBeatCreator: (beat: boolean) => void;

  // Reset action
  resetAll: () => void;
}

export type CustomPuzzleStore = CustomPuzzleState & CustomPuzzleActions;

// ==========================================
// Initial State
// ==========================================

const initialState: CustomPuzzleState = {
  phase: 'loading',
  puzzle: null,
  error: null,
  gameResult: null,
  leaderboard: [],
  playerRank: null,
  beatCreator: false,
};

// ==========================================
// Store Creation
// ==========================================

export const useCustomPuzzleStore = create<CustomPuzzleStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    // Core setters
    setPhase: (phase) => set({ phase }),
    setPuzzle: (puzzle) => set({ puzzle }),
    setError: (error) => set({ error }),

    // Game result setters
    setGameResult: (gameResult) => set({ gameResult }),

    // Leaderboard setters
    setLeaderboard: (leaderboard) => set({ leaderboard }),
    setPlayerRank: (playerRank) => set({ playerRank }),
    setBeatCreator: (beatCreator) => set({ beatCreator }),

    // Reset
    resetAll: () => set(initialState),
  }))
);

// ==========================================
// Selector Hooks (Recommended for Performance)
// ==========================================

// Core state selectors
export const useCustomPuzzlePhase = () => useCustomPuzzleStore((state) => state.phase);
export const useCustomPuzzlePuzzle = () => useCustomPuzzleStore((state) => state.puzzle);
export const useCustomPuzzleError = () => useCustomPuzzleStore((state) => state.error);

// Game result selector
export const useCustomPuzzleGameResult = () => useCustomPuzzleStore((state) => state.gameResult);

// Leaderboard selectors
export const useCustomPuzzleLeaderboard = () => useCustomPuzzleStore((state) => state.leaderboard);
export const useCustomPuzzlePlayerRank = () => useCustomPuzzleStore((state) => state.playerRank);
export const useCustomPuzzleBeatCreator = () => useCustomPuzzleStore((state) => state.beatCreator);

// Actions selectors — individual selectors return stable refs (Zustand actions never change)
// Using useShallow on an object of functions is fragile and can cause infinite re-render loops
export const useCustomPuzzleActions = () => ({
  setPhase: useCustomPuzzleStore((s) => s.setPhase),
  setPuzzle: useCustomPuzzleStore((s) => s.setPuzzle),
  setError: useCustomPuzzleStore((s) => s.setError),
  setGameResult: useCustomPuzzleStore((s) => s.setGameResult),
  setLeaderboard: useCustomPuzzleStore((s) => s.setLeaderboard),
  setPlayerRank: useCustomPuzzleStore((s) => s.setPlayerRank),
  setBeatCreator: useCustomPuzzleStore((s) => s.setBeatCreator),
  resetAll: useCustomPuzzleStore((s) => s.resetAll),
});
