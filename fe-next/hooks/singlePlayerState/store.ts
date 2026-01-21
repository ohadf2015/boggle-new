/**
 * Single Player Game State Store (Zustand)
 *
 * Centralized state management for single player mode with selective subscriptions.
 * Components only re-render when the specific state they subscribe to changes.
 *
 * USAGE:
 * ```tsx
 * // Subscribe to specific state (recommended - best performance)
 * const score = useSinglePlayerScore();
 * const isPaused = useSinglePlayerPaused();
 * const { setScore, addFoundWord } = useSinglePlayerActions();
 *
 * // Subscribe to multiple values
 * const { score, foundWords } = useSinglePlayerStore(state => ({
 *   score: state.score,
 *   foundWords: state.foundWords,
 * }));
 * ```
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { WordFeedback } from '@/components/game/WordFormingArea';

// ==========================================
// Type Definitions
// ==========================================

export interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  comboBonus?: number;
  fireRoundBonus?: number;
}

export interface RevealState {
  revealsUsed: number;
  isLoading: boolean;
  highlightedPath: Array<{ row: number; col: number }>;
}

export interface ComboState {
  level: number;
  maxCombo: number;
  lastWordTime: number | null;
}

export interface SinglePlayerState {
  // Core game state
  grid: LetterGrid | null;
  language: Language | null;
  foundWords: FoundWord[];
  score: number;
  isPaused: boolean;
  isGameOver: boolean;
  isValidatingWords: boolean;
  remainingTime: number | null;
  totalTime: number;
  minWordLength: number;

  // UI state
  showQuitConfirm: boolean;
  showLandscapeTutorial: boolean;
  showCompletionPopup: boolean;
  showHintPrompt: boolean;
  formedWord: string;
  letterCount: number;
  currentFeedback: WordFeedback | null;
  progressBarExpanded: boolean;
  comboCoinReward: number | null;

  // Reveal word state
  revealState: RevealState;

  // Combo state
  combo: ComboState;

  // Fire/Earthquake state
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  earthquakeState: 'idle' | 'warning' | 'shaking' | 'fire-round';

  // Bot scores (for leaderboard display)
  botScores: Record<string, number>;

  // Total words on board
  totalBoardWords: number | null;
}

export interface SinglePlayerActions {
  // Core setters
  setGrid: (grid: LetterGrid | null) => void;
  setLanguage: (language: Language | null) => void;
  setScore: (score: number | ((prev: number) => number)) => void;
  setFoundWords: (words: FoundWord[] | ((prev: FoundWord[]) => FoundWord[])) => void;
  addFoundWord: (word: FoundWord) => void;
  setIsPaused: (paused: boolean) => void;
  setIsGameOver: (gameOver: boolean) => void;
  setIsValidatingWords: (validating: boolean) => void;
  setRemainingTime: (time: number | null) => void;
  setTotalTime: (time: number) => void;
  setMinWordLength: (length: number) => void;

  // UI setters
  setShowQuitConfirm: (show: boolean) => void;
  setShowLandscapeTutorial: (show: boolean) => void;
  setShowCompletionPopup: (show: boolean) => void;
  setShowHintPrompt: (show: boolean) => void;
  setFormedWord: (word: string) => void;
  setLetterCount: (count: number) => void;
  setCurrentFeedback: (feedback: WordFeedback | null) => void;
  setProgressBarExpanded: (expanded: boolean) => void;
  setComboCoinReward: (reward: number | null) => void;

  // Reveal setters
  setRevealState: (state: Partial<RevealState>) => void;

  // Combo setters
  setComboLevel: (level: number) => void;
  setMaxCombo: (max: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;

  // Fire/Earthquake setters
  setFireRoundActive: (active: boolean) => void;
  setFireRoundRemaining: (remaining: number) => void;
  setEarthquakeState: (state: 'idle' | 'warning' | 'shaking' | 'fire-round') => void;

  // Bot setters
  setBotScores: (scores: Record<string, number>) => void;
  updateBotScore: (botId: string, score: number) => void;

  // Total board words
  setTotalBoardWords: (count: number | null) => void;

  // Reset actions
  resetForNewGame: () => void;
  resetAll: () => void;
}

export type SinglePlayerStore = SinglePlayerState & SinglePlayerActions;

// ==========================================
// Initial State
// ==========================================

const initialState: SinglePlayerState = {
  // Core game state
  grid: null,
  language: null,
  foundWords: [],
  score: 0,
  isPaused: false,
  isGameOver: false,
  isValidatingWords: false,
  remainingTime: null,
  totalTime: 120,
  minWordLength: 3,

  // UI state
  showQuitConfirm: false,
  showLandscapeTutorial: false,
  showCompletionPopup: false,
  showHintPrompt: false,
  formedWord: '',
  letterCount: 0,
  currentFeedback: null,
  progressBarExpanded: false,
  comboCoinReward: null,

  // Reveal state
  revealState: {
    revealsUsed: 0,
    isLoading: false,
    highlightedPath: [],
  },

  // Combo state
  combo: {
    level: 0,
    maxCombo: 0,
    lastWordTime: null,
  },

  // Fire/Earthquake state
  fireRoundActive: false,
  fireRoundRemaining: 0,
  earthquakeState: 'idle',

  // Bot scores
  botScores: {},

  // Total board words
  totalBoardWords: null,
};

// ==========================================
// Helper for SetStateAction support
// ==========================================

function applySetState<T>(value: T | ((prev: T) => T), current: T): T {
  return typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
}

// ==========================================
// Store Creation
// ==========================================

export const useSinglePlayerStore = create<SinglePlayerStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Core setters
    setGrid: (grid) => set({ grid }),
    setLanguage: (language) => set({ language }),
    setScore: (value) => set((state) => ({
      score: applySetState(value, state.score),
    })),
    setFoundWords: (value) => set((state) => ({
      foundWords: applySetState(value, state.foundWords),
    })),
    addFoundWord: (word) => set((state) => ({
      foundWords: [...state.foundWords, word],
    })),
    setIsPaused: (isPaused) => set({ isPaused }),
    setIsGameOver: (isGameOver) => set({ isGameOver }),
    setIsValidatingWords: (isValidatingWords) => set({ isValidatingWords }),
    setRemainingTime: (remainingTime) => set({ remainingTime }),
    setTotalTime: (totalTime) => set({ totalTime }),
    setMinWordLength: (minWordLength) => set({ minWordLength }),

    // UI setters
    setShowQuitConfirm: (showQuitConfirm) => set({ showQuitConfirm }),
    setShowLandscapeTutorial: (showLandscapeTutorial) => set({ showLandscapeTutorial }),
    setShowCompletionPopup: (showCompletionPopup) => set({ showCompletionPopup }),
    setShowHintPrompt: (showHintPrompt) => set({ showHintPrompt }),
    setFormedWord: (formedWord) => set({ formedWord }),
    setLetterCount: (letterCount) => set({ letterCount }),
    setCurrentFeedback: (currentFeedback) => set({ currentFeedback }),
    setProgressBarExpanded: (progressBarExpanded) => set({ progressBarExpanded }),
    setComboCoinReward: (comboCoinReward) => set({ comboCoinReward }),

    // Reveal setters
    setRevealState: (partialState) => set((state) => ({
      revealState: { ...state.revealState, ...partialState },
    })),

    // Combo setters
    setComboLevel: (level) => set((state) => ({
      combo: { ...state.combo, level },
    })),
    setMaxCombo: (maxCombo) => set((state) => ({
      combo: { ...state.combo, maxCombo },
    })),
    incrementCombo: () => set((state) => {
      const newLevel = state.combo.level + 1;
      return {
        combo: {
          ...state.combo,
          level: newLevel,
          maxCombo: Math.max(state.combo.maxCombo, newLevel),
          lastWordTime: Date.now(),
        },
      };
    }),
    resetCombo: () => set((state) => ({
      combo: { ...state.combo, level: 0, lastWordTime: null },
    })),

    // Fire/Earthquake setters
    setFireRoundActive: (fireRoundActive) => set({ fireRoundActive }),
    setFireRoundRemaining: (fireRoundRemaining) => set({ fireRoundRemaining }),
    setEarthquakeState: (earthquakeState) => set({ earthquakeState }),

    // Bot setters
    setBotScores: (botScores) => set({ botScores }),
    updateBotScore: (botId, score) => set((state) => ({
      botScores: { ...state.botScores, [botId]: score },
    })),

    // Total board words
    setTotalBoardWords: (totalBoardWords) => set({ totalBoardWords }),

    // Reset for new game (keeps settings)
    resetForNewGame: () => set({
      foundWords: [],
      score: 0,
      isPaused: false,
      isGameOver: false,
      isValidatingWords: false,
      formedWord: '',
      letterCount: 0,
      currentFeedback: null,
      comboCoinReward: null,
      revealState: initialState.revealState,
      combo: initialState.combo,
      fireRoundActive: false,
      fireRoundRemaining: 0,
      earthquakeState: 'idle',
      botScores: {},
      totalBoardWords: null,
    }),

    // Full reset
    resetAll: () => set(initialState),
  }))
);

// ==========================================
// Selector Hooks (Recommended for Performance)
// ==========================================

// Core state selectors
export const useSinglePlayerGrid = () => useSinglePlayerStore((state) => state.grid);
export const useSinglePlayerLanguage = () => useSinglePlayerStore((state) => state.language);
export const useSinglePlayerScore = () => useSinglePlayerStore((state) => state.score);
export const useSinglePlayerFoundWords = () => useSinglePlayerStore((state) => state.foundWords);
export const useSinglePlayerPaused = () => useSinglePlayerStore((state) => state.isPaused);
export const useSinglePlayerGameOver = () => useSinglePlayerStore((state) => state.isGameOver);
export const useSinglePlayerValidating = () => useSinglePlayerStore((state) => state.isValidatingWords);
export const useSinglePlayerRemainingTime = () => useSinglePlayerStore((state) => state.remainingTime);
export const useSinglePlayerTotalTime = () => useSinglePlayerStore((state) => state.totalTime);

// UI state selectors
export const useSinglePlayerShowQuitConfirm = () => useSinglePlayerStore((state) => state.showQuitConfirm);
export const useSinglePlayerShowHintPrompt = () => useSinglePlayerStore((state) => state.showHintPrompt);
export const useSinglePlayerFormedWord = () => useSinglePlayerStore((state) => state.formedWord);
export const useSinglePlayerCurrentFeedback = () => useSinglePlayerStore((state) => state.currentFeedback);
export const useSinglePlayerComboCoinReward = () => useSinglePlayerStore((state) => state.comboCoinReward);

// Reveal state selector
export const useSinglePlayerRevealState = () => useSinglePlayerStore((state) => state.revealState);

// Combo state selector
export const useSinglePlayerCombo = () => useSinglePlayerStore((state) => state.combo);
export const useSinglePlayerComboLevel = () => useSinglePlayerStore((state) => state.combo.level);
export const useSinglePlayerMaxCombo = () => useSinglePlayerStore((state) => state.combo.maxCombo);

// Fire/Earthquake selectors
export const useSinglePlayerFireRoundActive = () => useSinglePlayerStore((state) => state.fireRoundActive);
export const useSinglePlayerFireRoundRemaining = () => useSinglePlayerStore((state) => state.fireRoundRemaining);
export const useSinglePlayerEarthquakeState = () => useSinglePlayerStore((state) => state.earthquakeState);

// Bot scores selector
export const useSinglePlayerBotScores = () => useSinglePlayerStore((state) => state.botScores);

// Total board words selector
export const useSinglePlayerTotalBoardWords = () => useSinglePlayerStore((state) => state.totalBoardWords);

// Actions selector (never causes re-renders since actions are stable)
export const useSinglePlayerActions = () => useSinglePlayerStore((state) => ({
  setGrid: state.setGrid,
  setLanguage: state.setLanguage,
  setScore: state.setScore,
  setFoundWords: state.setFoundWords,
  addFoundWord: state.addFoundWord,
  setIsPaused: state.setIsPaused,
  setIsGameOver: state.setIsGameOver,
  setIsValidatingWords: state.setIsValidatingWords,
  setRemainingTime: state.setRemainingTime,
  setTotalTime: state.setTotalTime,
  setMinWordLength: state.setMinWordLength,
  setShowQuitConfirm: state.setShowQuitConfirm,
  setShowLandscapeTutorial: state.setShowLandscapeTutorial,
  setShowCompletionPopup: state.setShowCompletionPopup,
  setShowHintPrompt: state.setShowHintPrompt,
  setFormedWord: state.setFormedWord,
  setLetterCount: state.setLetterCount,
  setCurrentFeedback: state.setCurrentFeedback,
  setProgressBarExpanded: state.setProgressBarExpanded,
  setComboCoinReward: state.setComboCoinReward,
  setRevealState: state.setRevealState,
  setComboLevel: state.setComboLevel,
  setMaxCombo: state.setMaxCombo,
  incrementCombo: state.incrementCombo,
  resetCombo: state.resetCombo,
  setFireRoundActive: state.setFireRoundActive,
  setFireRoundRemaining: state.setFireRoundRemaining,
  setEarthquakeState: state.setEarthquakeState,
  setBotScores: state.setBotScores,
  updateBotScore: state.updateBotScore,
  setTotalBoardWords: state.setTotalBoardWords,
  resetForNewGame: state.resetForNewGame,
  resetAll: state.resetAll,
}));
