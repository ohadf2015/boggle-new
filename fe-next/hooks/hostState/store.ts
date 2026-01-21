/**
 * Host View Game State Store (Zustand)
 *
 * Centralized state management for host view mode with selective subscriptions.
 * Components only re-render when the specific state they subscribe to changes.
 *
 * USAGE:
 * ```tsx
 * // Subscribe to specific state (recommended - best performance)
 * const gameStarted = useHostGameStarted();
 * const playersReady = useHostPlayersReady();
 * const { setGameStarted, setPlayersReady } = useHostActions();
 *
 * // Subscribe to multiple values
 * const { gameStarted, remainingTime } = useHostStore(state => ({
 *   gameStarted: state.gameStarted,
 *   remainingTime: state.remainingTime,
 * }));
 * ```
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_MIN_WORD_LENGTH } from '@/utils/consts';
import type { Language, LetterGrid, DifficultyLevel } from '@/types';
import type { Player } from '@/hooks/useGameState';
import type { BoardTheme } from '@/shared/types/socket';

// ==========================================
// Type Definitions
// ==========================================

export interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

export interface FinalScoresData {
  players: Array<{
    username: string;
    score: number;
    wordsFound: number;
    avatar?: {
      avatarImage?: string;
      avatarEmoji?: string;
      avatarColor?: string;
    };
  }>;
  gameCode: string;
}

export interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

export interface HostState {
  // Game Settings (pre-game configuration)
  difficulty: DifficultyLevel;
  minWordLength: number;
  timerValue: number;
  timerDirection: number;
  hostPlaying: boolean;
  gameType: 'regular' | 'tournament';
  tournamentRounds: number;
  roomLanguage: Language;

  // Game Runtime
  gameStarted: boolean;
  tableData: LetterGrid;
  remainingTime: number | null;
  waitingForResults: boolean;
  showStartAnimation: boolean;

  // Player Tracking
  playersReady: Player[];
  playerWordCounts: Record<string, number>;
  playerScores: Record<string, number>;
  playerAchievements: Record<string, string[]>;

  // Host Playing State
  hostFoundWords: string[];
  hostAchievements: string[];

  // Tournament State
  tournamentData: TournamentData | null;
  tournamentCreating: boolean;
  finalScores: FinalScoresData | null;

  // Animation State
  shufflingGrid: LetterGrid | null;
  highlightedCells: Array<{ row: number; col: number }>;

  // UI State
  showQR: boolean;
  showExitConfirm: boolean;
  showCancelTournamentDialog: boolean;

  // Combo State
  comboLevel: number;
  lastWordTime: number | null;

  // XP State
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;

  // Board Configuration
  wordsForBoard: string[];
  boardTheme: BoardTheme | null;
}

export interface HostActions {
  // Settings setters
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setMinWordLength: (length: number) => void;
  setTimerValue: (value: number) => void;
  setTimerDirection: (direction: number) => void;
  setHostPlaying: (playing: boolean) => void;
  setGameType: (type: 'regular' | 'tournament') => void;
  setTournamentRounds: (rounds: number) => void;
  setRoomLanguage: (language: Language) => void;

  // Runtime setters
  setGameStarted: (started: boolean) => void;
  setTableData: (data: LetterGrid) => void;
  setRemainingTime: (time: number | null) => void;
  setWaitingForResults: (waiting: boolean) => void;
  setShowStartAnimation: (show: boolean) => void;

  // Player setters
  setPlayersReady: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setPlayerWordCounts: (counts: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setPlayerScores: (scores: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setPlayerAchievements: (achievements: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
  updatePlayerWordCount: (username: string, count: number) => void;
  updatePlayerScore: (username: string, score: number) => void;

  // Host playing setters
  setHostFoundWords: (words: string[] | ((prev: string[]) => string[])) => void;
  setHostAchievements: (achievements: string[] | ((prev: string[]) => string[])) => void;
  addHostFoundWord: (word: string) => void;

  // Tournament setters
  setTournamentData: (data: TournamentData | null) => void;
  setTournamentCreating: (creating: boolean) => void;
  setFinalScores: (scores: FinalScoresData | null) => void;

  // Animation setters
  setShufflingGrid: (grid: LetterGrid | null) => void;
  setHighlightedCells: (cells: Array<{ row: number; col: number }>) => void;

  // UI setters
  setShowQR: (show: boolean) => void;
  setShowExitConfirm: (show: boolean) => void;
  setShowCancelTournamentDialog: (show: boolean) => void;

  // Combo setters
  setComboLevel: (level: number) => void;
  setLastWordTime: (time: number | null) => void;
  incrementCombo: () => void;
  resetCombo: () => void;

  // XP setters
  setXpGainedData: (data: XpGainedData | null) => void;
  setLevelUpData: (data: LevelUpData | null) => void;

  // Board configuration
  setWordsForBoard: (words: string[]) => void;
  setBoardTheme: (theme: BoardTheme | null) => void;

  // Reset actions
  resetForNewGame: () => void;
  resetAll: () => void;
  generateNewTable: () => LetterGrid;
}

export type HostStore = HostState & HostActions;

// ==========================================
// Initial State
// ==========================================

const createInitialState = (roomLanguage: Language = 'en'): HostState => ({
  // Settings
  difficulty: DEFAULT_DIFFICULTY,
  minWordLength: DEFAULT_MIN_WORD_LENGTH,
  timerValue: 1,
  timerDirection: 0,
  hostPlaying: true,
  gameType: 'regular',
  tournamentRounds: 3,
  roomLanguage,

  // Runtime
  gameStarted: false,
  tableData: generateRandomTable(),
  remainingTime: null,
  waitingForResults: false,
  showStartAnimation: false,

  // Players
  playersReady: [],
  playerWordCounts: {},
  playerScores: {},
  playerAchievements: {},

  // Host playing
  hostFoundWords: [],
  hostAchievements: [],

  // Tournament
  tournamentData: null,
  tournamentCreating: false,
  finalScores: null,

  // Animation
  shufflingGrid: null,
  highlightedCells: [],

  // UI
  showQR: false,
  showExitConfirm: false,
  showCancelTournamentDialog: false,

  // Combo
  comboLevel: 0,
  lastWordTime: null,

  // XP
  xpGainedData: null,
  levelUpData: null,

  // Board
  wordsForBoard: [],
  boardTheme: null,
});

// ==========================================
// Helper for SetStateAction support
// ==========================================

function applySetState<T>(value: T | ((prev: T) => T), current: T): T {
  return typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
}

// ==========================================
// Store Creation
// ==========================================

export const useHostStore = create<HostStore>()(
  subscribeWithSelector((set, get) => ({
    ...createInitialState(),

    // Settings setters
    setDifficulty: (difficulty) => set({ difficulty }),
    setMinWordLength: (minWordLength) => set({ minWordLength }),
    setTimerValue: (timerValue) => set({ timerValue }),
    setTimerDirection: (timerDirection) => set({ timerDirection }),
    setHostPlaying: (hostPlaying) => set({ hostPlaying }),
    setGameType: (gameType) => set({ gameType }),
    setTournamentRounds: (tournamentRounds) => set({ tournamentRounds }),
    setRoomLanguage: (roomLanguage) => set({ roomLanguage }),

    // Runtime setters
    setGameStarted: (gameStarted) => set({ gameStarted }),
    setTableData: (tableData) => set({ tableData }),
    setRemainingTime: (remainingTime) => set({ remainingTime }),
    setWaitingForResults: (waitingForResults) => set({ waitingForResults }),
    setShowStartAnimation: (showStartAnimation) => set({ showStartAnimation }),

    // Player setters
    setPlayersReady: (value) => set((state) => ({
      playersReady: applySetState(value, state.playersReady),
    })),
    setPlayerWordCounts: (value) => set((state) => ({
      playerWordCounts: applySetState(value, state.playerWordCounts),
    })),
    setPlayerScores: (value) => set((state) => ({
      playerScores: applySetState(value, state.playerScores),
    })),
    setPlayerAchievements: (value) => set((state) => ({
      playerAchievements: applySetState(value, state.playerAchievements),
    })),
    updatePlayerWordCount: (username, count) => set((state) => ({
      playerWordCounts: { ...state.playerWordCounts, [username]: count },
    })),
    updatePlayerScore: (username, score) => set((state) => ({
      playerScores: { ...state.playerScores, [username]: score },
    })),

    // Host playing setters
    setHostFoundWords: (value) => set((state) => ({
      hostFoundWords: applySetState(value, state.hostFoundWords),
    })),
    setHostAchievements: (value) => set((state) => ({
      hostAchievements: applySetState(value, state.hostAchievements),
    })),
    addHostFoundWord: (word) => set((state) => ({
      hostFoundWords: [...state.hostFoundWords, word],
    })),

    // Tournament setters
    setTournamentData: (tournamentData) => set({ tournamentData }),
    setTournamentCreating: (tournamentCreating) => set({ tournamentCreating }),
    setFinalScores: (finalScores) => set({ finalScores }),

    // Animation setters
    setShufflingGrid: (shufflingGrid) => set({ shufflingGrid }),
    setHighlightedCells: (highlightedCells) => set({ highlightedCells }),

    // UI setters
    setShowQR: (showQR) => set({ showQR }),
    setShowExitConfirm: (showExitConfirm) => set({ showExitConfirm }),
    setShowCancelTournamentDialog: (showCancelTournamentDialog) => set({ showCancelTournamentDialog }),

    // Combo setters
    setComboLevel: (comboLevel) => set({ comboLevel }),
    setLastWordTime: (lastWordTime) => set({ lastWordTime }),
    incrementCombo: () => set((state) => ({
      comboLevel: state.comboLevel + 1,
      lastWordTime: Date.now(),
    })),
    resetCombo: () => set({ comboLevel: 0, lastWordTime: null }),

    // XP setters
    setXpGainedData: (xpGainedData) => set({ xpGainedData }),
    setLevelUpData: (levelUpData) => set({ levelUpData }),

    // Board configuration
    setWordsForBoard: (wordsForBoard) => set({ wordsForBoard }),
    setBoardTheme: (boardTheme) => set({ boardTheme }),

    // Reset for new game
    resetForNewGame: () => set((state) => ({
      gameStarted: false,
      remainingTime: null,
      waitingForResults: false,
      showStartAnimation: false,
      shufflingGrid: null,
      playerWordCounts: {},
      playerScores: {},
      playerAchievements: {},
      hostFoundWords: [],
      hostAchievements: [],
      finalScores: null,
      tournamentData: null,
      tournamentCreating: false,
      comboLevel: 0,
      lastWordTime: null,
      xpGainedData: null,
      levelUpData: null,
    })),

    // Full reset
    resetAll: () => set(createInitialState()),

    // Generate new table based on current settings
    generateNewTable: () => {
      const state = get();
      const difficultyConfig = DIFFICULTIES[state.difficulty];
      const embedWords = state.roomLanguage !== 'ja' ? state.wordsForBoard : [];
      return generateRandomTable(
        difficultyConfig.rows,
        difficultyConfig.cols,
        state.roomLanguage,
        embedWords
      );
    },
  }))
);

// ==========================================
// Selector Hooks (Recommended for Performance)
// ==========================================

// Settings selectors
export const useHostDifficulty = () => useHostStore((state) => state.difficulty);
export const useHostMinWordLength = () => useHostStore((state) => state.minWordLength);
export const useHostTimerValue = () => useHostStore((state) => state.timerValue);
export const useHostPlaying = () => useHostStore((state) => state.hostPlaying);
export const useHostGameType = () => useHostStore((state) => state.gameType);
export const useHostTournamentRounds = () => useHostStore((state) => state.tournamentRounds);
export const useHostRoomLanguage = () => useHostStore((state) => state.roomLanguage);

// Runtime selectors
export const useHostGameStarted = () => useHostStore((state) => state.gameStarted);
export const useHostTableData = () => useHostStore((state) => state.tableData);
export const useHostRemainingTime = () => useHostStore((state) => state.remainingTime);
export const useHostWaitingForResults = () => useHostStore((state) => state.waitingForResults);
export const useHostShowStartAnimation = () => useHostStore((state) => state.showStartAnimation);

// Player selectors
export const useHostPlayersReady = () => useHostStore((state) => state.playersReady);
export const useHostPlayerWordCounts = () => useHostStore((state) => state.playerWordCounts);
export const useHostPlayerScores = () => useHostStore((state) => state.playerScores);
export const useHostPlayerAchievements = () => useHostStore((state) => state.playerAchievements);

// Host playing selectors
export const useHostFoundWords = () => useHostStore((state) => state.hostFoundWords);
export const useHostAchievements = () => useHostStore((state) => state.hostAchievements);

// Tournament selectors
export const useHostTournamentData = () => useHostStore((state) => state.tournamentData);
export const useHostTournamentCreating = () => useHostStore((state) => state.tournamentCreating);
export const useHostFinalScores = () => useHostStore((state) => state.finalScores);

// Animation selectors
export const useHostShufflingGrid = () => useHostStore((state) => state.shufflingGrid);
export const useHostHighlightedCells = () => useHostStore((state) => state.highlightedCells);

// UI selectors
export const useHostShowQR = () => useHostStore((state) => state.showQR);
export const useHostShowExitConfirm = () => useHostStore((state) => state.showExitConfirm);
export const useHostShowCancelTournamentDialog = () => useHostStore((state) => state.showCancelTournamentDialog);

// Combo selectors
export const useHostComboLevel = () => useHostStore((state) => state.comboLevel);
export const useHostLastWordTime = () => useHostStore((state) => state.lastWordTime);

// XP selectors
export const useHostXpGainedData = () => useHostStore((state) => state.xpGainedData);
export const useHostLevelUpData = () => useHostStore((state) => state.levelUpData);

// Board selectors
export const useHostWordsForBoard = () => useHostStore((state) => state.wordsForBoard);
export const useHostBoardTheme = () => useHostStore((state) => state.boardTheme);

// Grouped state selectors (for components needing multiple values)
export const useHostSettings = () => useHostStore((state) => ({
  difficulty: state.difficulty,
  minWordLength: state.minWordLength,
  timerValue: state.timerValue,
  timerDirection: state.timerDirection,
  hostPlaying: state.hostPlaying,
  gameType: state.gameType,
  tournamentRounds: state.tournamentRounds,
}));

export const useHostRuntime = () => useHostStore((state) => ({
  gameStarted: state.gameStarted,
  tableData: state.tableData,
  remainingTime: state.remainingTime,
  waitingForResults: state.waitingForResults,
  showStartAnimation: state.showStartAnimation,
}));

export const useHostPlayers = () => useHostStore((state) => ({
  playersReady: state.playersReady,
  playerWordCounts: state.playerWordCounts,
  playerScores: state.playerScores,
  playerAchievements: state.playerAchievements,
}));

export const useHostTournament = () => useHostStore((state) => ({
  tournamentData: state.tournamentData,
  tournamentCreating: state.tournamentCreating,
  finalScores: state.finalScores,
}));

export const useHostUI = () => useHostStore((state) => ({
  showQR: state.showQR,
  showExitConfirm: state.showExitConfirm,
  showCancelTournamentDialog: state.showCancelTournamentDialog,
}));

// Actions selector (never causes re-renders since actions are stable)
export const useHostActions = () => useHostStore((state) => ({
  // Settings
  setDifficulty: state.setDifficulty,
  setMinWordLength: state.setMinWordLength,
  setTimerValue: state.setTimerValue,
  setTimerDirection: state.setTimerDirection,
  setHostPlaying: state.setHostPlaying,
  setGameType: state.setGameType,
  setTournamentRounds: state.setTournamentRounds,
  setRoomLanguage: state.setRoomLanguage,
  // Runtime
  setGameStarted: state.setGameStarted,
  setTableData: state.setTableData,
  setRemainingTime: state.setRemainingTime,
  setWaitingForResults: state.setWaitingForResults,
  setShowStartAnimation: state.setShowStartAnimation,
  // Players
  setPlayersReady: state.setPlayersReady,
  setPlayerWordCounts: state.setPlayerWordCounts,
  setPlayerScores: state.setPlayerScores,
  setPlayerAchievements: state.setPlayerAchievements,
  updatePlayerWordCount: state.updatePlayerWordCount,
  updatePlayerScore: state.updatePlayerScore,
  // Host playing
  setHostFoundWords: state.setHostFoundWords,
  setHostAchievements: state.setHostAchievements,
  addHostFoundWord: state.addHostFoundWord,
  // Tournament
  setTournamentData: state.setTournamentData,
  setTournamentCreating: state.setTournamentCreating,
  setFinalScores: state.setFinalScores,
  // Animation
  setShufflingGrid: state.setShufflingGrid,
  setHighlightedCells: state.setHighlightedCells,
  // UI
  setShowQR: state.setShowQR,
  setShowExitConfirm: state.setShowExitConfirm,
  setShowCancelTournamentDialog: state.setShowCancelTournamentDialog,
  // Combo
  setComboLevel: state.setComboLevel,
  setLastWordTime: state.setLastWordTime,
  incrementCombo: state.incrementCombo,
  resetCombo: state.resetCombo,
  // XP
  setXpGainedData: state.setXpGainedData,
  setLevelUpData: state.setLevelUpData,
  // Board
  setWordsForBoard: state.setWordsForBoard,
  setBoardTheme: state.setBoardTheme,
  // Reset
  resetForNewGame: state.resetForNewGame,
  resetAll: state.resetAll,
  generateNewTable: state.generateNewTable,
}));
