/**
 * Zustand Game State Store
 *
 * This store replaces the Context + useReducer pattern with Zustand for better performance.
 *
 * KEY BENEFIT: Components subscribe to specific slices of state, so they only re-render
 * when the data they actually use changes. This eliminates the "God Context" problem
 * where any state change caused all consumers to re-render.
 *
 * MIGRATION: The store maintains the same API as the previous useGameState hook,
 * so existing components can migrate incrementally.
 *
 * USAGE:
 * ```tsx
 * // Option 1: Use specific selector (RECOMMENDED - best performance)
 * const gameActive = useGameStore(state => state.gameActive);
 *
 * // Option 2: Use pre-made selector hooks (cleaner API)
 * const gameActive = useGameActive();
 *
 * // Option 3: Use multiple values with shallow comparison
 * const { gameActive, remainingTime } = useGameStore(
 *   state => ({ gameActive: state.gameActive, remainingTime: state.remainingTime }),
 *   shallow
 * );
 * ```
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LetterGrid, LeaderboardEntry, Language, WordDetail, GameModeSelection, BlastTileOverlay, LetterFeedback } from '@/shared/types/game';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload, BoardTheme } from '@/shared/types/socket';
import type { Player, TournamentData, TournamentStanding, ComboState } from './types';
import { COMBO_SHIELD_INTERVAL } from '@/utils/consts';

// ==========================================
// Constants
// ==========================================

const COMBO_TIMEOUT_MS = 8000; // 8 seconds to maintain combo

// ==========================================
// Default Values
// ==========================================

const DEFAULT_COMBO_STATE: ComboState = {
  level: 0,
  lastWordTime: null,
  shieldsUsed: 0,
};

// ==========================================
// Store State Interface
// ==========================================

interface GameState {
  // Core game state
  gameActive: boolean;
  letterGrid: LetterGrid | null;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;
  totalBoardWords: number | null;

  // Player state
  players: Player[];
  leaderboard: LeaderboardEntry[];

  // Word state
  foundWords: WordDetail[];
  achievements: AchievementPayload[];

  // UI state
  waitingForResults: boolean;
  showStartAnimation: boolean;
  shufflingGrid: LetterGrid | null;
  highlightedCells: Array<{ row: number; col: number }>;

  // Combo state
  combo: ComboState;

  // Tournament state
  tournamentData: TournamentData | null;
  tournamentStandings: TournamentStanding[];
  showTournamentStandings: boolean;

  // XP/Level state
  xpGainedData: XpGainedPayload | null;
  levelUpData: LevelUpPayload | null;

  // Board theme
  boardTheme: BoardTheme | null;

  // Game mode (multiplayer mode rotation; 'random' = server picks)
  gameMode: GameModeSelection;

  // Blast multiplayer state
  blastTileOverlay: BlastTileOverlay[];
  blastMovesUsed: number;
  /** Seeded PRNG seed from server for deterministic multiplayer refills */
  blastSeed: number | null;
  /** Pending combo sync from another player — triggers BlastComboFlash for spectators */
  blastComboSync: { comboType: string; username: string; id: string } | null;

  // Word Hunt multiplayer state
  wordHuntTargetLength: number;
  wordHuntMyLife: number;
  wordHuntPlayerLives: Record<string, number>;
  wordHuntTargetAttempts: Array<{ guess: string; feedback: LetterFeedback[]; isDiscovery?: boolean }>;
  wordHuntTargetFound: boolean;
  wordHuntEliminatedPlayers: string[];
  wordHuntDiscoveryClues: Array<{ position: number; letter: string }>;
  wordHuntKnownLetters: string[];

  // _comboTimeoutId removed from state — stored as module-level variable to avoid re-renders
}

// ==========================================
// Store Actions Interface
// ==========================================

interface GameActions {
  // Core game actions
  setGameActive: (value: boolean | ((prev: boolean) => boolean)) => void;
  setLetterGrid: (value: LetterGrid | null | ((prev: LetterGrid | null) => LetterGrid | null)) => void;
  setRemainingTime: (value: number | null | ((prev: number | null) => number | null)) => void;
  setGameLanguage: (value: Language | null | ((prev: Language | null) => Language | null)) => void;
  setMinWordLength: (value: number | ((prev: number) => number)) => void;
  setTotalBoardWords: (value: number | null | ((prev: number | null) => number | null)) => void;

  // Player actions
  setPlayers: (value: Player[] | ((prev: Player[]) => Player[])) => void;
  updatePlayer: (username: string, updates: Partial<Player>) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (username: string) => void;
  setLeaderboard: (value: LeaderboardEntry[] | ((prev: LeaderboardEntry[]) => LeaderboardEntry[])) => void;

  // Word actions
  addFoundWord: (word: WordDetail) => void;
  setFoundWords: (value: WordDetail[] | ((prev: WordDetail[]) => WordDetail[])) => void;
  addAchievement: (achievement: AchievementPayload) => void;
  setAchievements: (value: AchievementPayload[] | ((prev: AchievementPayload[]) => AchievementPayload[])) => void;

  // UI actions
  setWaitingForResults: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowStartAnimation: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShufflingGrid: (value: LetterGrid | null | ((prev: LetterGrid | null) => LetterGrid | null)) => void;
  setHighlightedCells: (value: Array<{ row: number; col: number }> | ((prev: Array<{ row: number; col: number }>) => Array<{ row: number; col: number }>)) => void;

  // Combo actions
  incrementCombo: () => void;
  resetCombo: () => void;
  useComboShield: () => boolean;
  updateLastWordTime: () => void;

  // Tournament actions
  setTournamentData: (value: TournamentData | null | ((prev: TournamentData | null) => TournamentData | null)) => void;
  setTournamentStandings: (value: TournamentStanding[] | ((prev: TournamentStanding[]) => TournamentStanding[])) => void;
  setShowTournamentStandings: (value: boolean | ((prev: boolean) => boolean)) => void;

  // XP/Level actions
  setXpGainedData: (value: XpGainedPayload | null | ((prev: XpGainedPayload | null) => XpGainedPayload | null)) => void;
  setLevelUpData: (value: LevelUpPayload | null | ((prev: LevelUpPayload | null) => LevelUpPayload | null)) => void;

  // Board theme actions
  setBoardTheme: (value: BoardTheme | null | ((prev: BoardTheme | null) => BoardTheme | null)) => void;

  // Game mode actions
  setGameMode: (value: GameModeSelection | ((prev: GameModeSelection) => GameModeSelection)) => void;

  // Blast multiplayer actions
  setBlastTileOverlay: (value: BlastTileOverlay[] | ((prev: BlastTileOverlay[]) => BlastTileOverlay[])) => void;
  setBlastMovesUsed: (value: number | ((prev: number) => number)) => void;
  setBlastSeed: (value: number | null | ((prev: number | null) => number | null)) => void;
  setBlastComboSync: (value: { comboType: string; username: string; id: string } | null) => void;

  // Word Hunt multiplayer actions
  setWordHuntTargetLength: (value: number | ((prev: number) => number)) => void;
  setWordHuntMyLife: (value: number | ((prev: number) => number)) => void;
  setWordHuntPlayerLives: (value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setWordHuntTargetAttempts: (value: Array<{ guess: string; feedback: LetterFeedback[] }> | ((prev: Array<{ guess: string; feedback: LetterFeedback[] }>) => Array<{ guess: string; feedback: LetterFeedback[] }>)) => void;
  setWordHuntTargetFound: (value: boolean | ((prev: boolean) => boolean)) => void;
  setWordHuntEliminatedPlayers: (value: string[] | ((prev: string[]) => string[])) => void;
  addWordHuntDiscoveryClues: (greens: Array<{ position: number; letter: string }>, known: string[]) => void;

  // Batch actions (performance: single set() call instead of many)
  batchStartGame: (data: {
    letterGrid?: LetterGrid | null;
    remainingTime?: number | null;
    gameLanguage?: Language | null;
    minWordLength?: number;
    boardTheme?: BoardTheme | null;
    gameMode?: GameModeSelection;
    blastTileOverlay?: BlastTileOverlay[];
    blastMovesUsed?: number;
    blastSeed?: number | null;
    wordHuntTargetLength?: number;
    wordHuntMyLife?: number;
    showStartAnimation?: boolean;
    gameActive?: boolean;
  }) => void;
  batchResetGame: () => void;

  // Reset actions
  resetForNewRound: () => void;
  resetAll: () => void;
}

// ==========================================
// Combined Store Type
// ==========================================

export type GameStore = GameState & GameActions;

// ==========================================
// Initial State
// ==========================================

// Module-level variable for combo timeout — NOT in Zustand state to avoid re-renders
let _comboTimeoutId: NodeJS.Timeout | null = null;

const initialState: GameState = {
  gameActive: false,
  letterGrid: null,
  remainingTime: null,
  gameLanguage: null,
  minWordLength: 2,
  totalBoardWords: null,
  players: [],
  leaderboard: [],
  foundWords: [],
  achievements: [],
  waitingForResults: false,
  showStartAnimation: false,
  shufflingGrid: null,
  highlightedCells: [],
  combo: DEFAULT_COMBO_STATE,
  tournamentData: null,
  tournamentStandings: [],
  showTournamentStandings: false,
  xpGainedData: null,
  levelUpData: null,
  boardTheme: null,
  gameMode: 'classic',
  blastTileOverlay: [],
  blastMovesUsed: 0,
  blastSeed: null,
  blastComboSync: null,
  wordHuntTargetLength: 0,
  wordHuntMyLife: 100,
  wordHuntPlayerLives: {},
  wordHuntTargetAttempts: [],
  wordHuntTargetFound: false,
  wordHuntEliminatedPlayers: [],
  wordHuntDiscoveryClues: [],
  wordHuntKnownLetters: [],
};

// ==========================================
// Helper: Apply SetStateAction
// ==========================================

function applySetState<T>(value: T | ((prev: T) => T), current: T): T {
  return typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
}

// ==========================================
// Store Creation
// ==========================================

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...initialState,

    // ==========================================
    // Core Game Actions
    // ==========================================

    setGameActive: (value) => set((state) => ({
      gameActive: applySetState(value, state.gameActive)
    })),

    setLetterGrid: (value) => set((state) => ({
      letterGrid: applySetState(value, state.letterGrid)
    })),

    setRemainingTime: (value) => set((state) => ({
      remainingTime: applySetState(value, state.remainingTime)
    })),

    setGameLanguage: (value) => set((state) => ({
      gameLanguage: applySetState(value, state.gameLanguage)
    })),

    setMinWordLength: (value) => set((state) => ({
      minWordLength: applySetState(value, state.minWordLength)
    })),

    setTotalBoardWords: (value) => set((state) => ({
      totalBoardWords: applySetState(value, state.totalBoardWords)
    })),

    // ==========================================
    // Player Actions
    // ==========================================

    setPlayers: (value) => set((state) => ({
      players: applySetState(value, state.players)
    })),

    updatePlayer: (username, updates) => set((state) => ({
      players: state.players.map(p =>
        p.username === username ? { ...p, ...updates } : p
      )
    })),

    addPlayer: (player) => set((state) => {
      const existingIndex = state.players.findIndex(p => p.username === player.username);
      if (existingIndex >= 0) {
        const updatedPlayers = [...state.players];
        updatedPlayers[existingIndex] = { ...updatedPlayers[existingIndex], ...player };
        return { players: updatedPlayers };
      }
      return { players: [...state.players, player] };
    }),

    removePlayer: (username) => set((state) => ({
      players: state.players.filter(p => p.username !== username)
    })),

    setLeaderboard: (value) => set((state) => ({
      leaderboard: applySetState(value, state.leaderboard)
    })),

    // ==========================================
    // Word Actions
    // ==========================================

    addFoundWord: (word) => set((state) => {
      const wordExists = state.foundWords.some(
        w => w.word.toLowerCase() === word.word.toLowerCase()
      );
      if (wordExists) return state;
      return { foundWords: [...state.foundWords, word] };
    }),

    setFoundWords: (value) => set((state) => ({
      foundWords: applySetState(value, state.foundWords)
    })),

    addAchievement: (achievement) => set((state) => {
      if (state.achievements.some(a => a.key === achievement.key)) return state;
      return { achievements: [...state.achievements, achievement] };
    }),

    setAchievements: (value) => set((state) => ({
      achievements: applySetState(value, state.achievements)
    })),

    // ==========================================
    // UI Actions
    // ==========================================

    setWaitingForResults: (value) => set((state) => ({
      waitingForResults: applySetState(value, state.waitingForResults)
    })),

    setShowStartAnimation: (value) => set((state) => ({
      showStartAnimation: applySetState(value, state.showStartAnimation)
    })),

    setShufflingGrid: (value) => set((state) => ({
      shufflingGrid: applySetState(value, state.shufflingGrid)
    })),

    setHighlightedCells: (value) => set((state) => ({
      highlightedCells: applySetState(value, state.highlightedCells)
    })),

    // ==========================================
    // Combo Actions
    // ==========================================

    incrementCombo: () => {
      const state = get();

      // Clear existing timeout
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
      }

      // Set new timeout for combo reset
      _comboTimeoutId = setTimeout(() => {
        _comboTimeoutId = null;
        set({ combo: { ...get().combo, level: 0 } });
      }, COMBO_TIMEOUT_MS);

      set({
        combo: {
          ...state.combo,
          level: state.combo.level + 1,
          lastWordTime: Date.now(),
        },
      });
    },

    resetCombo: () => {
      const state = get();
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
        _comboTimeoutId = null;
      }
      set({
        combo: { ...state.combo, level: 0 },
      });
    },

    useComboShield: () => {
      const state = get();
      const validWordCount = state.foundWords.filter(w => w.validated !== false).length;
      const availableShields = Math.floor(validWordCount / COMBO_SHIELD_INTERVAL);

      if (state.combo.shieldsUsed < availableShields) {
        set({
          combo: { ...state.combo, shieldsUsed: state.combo.shieldsUsed + 1 }
        });
        return true;
      }
      return false;
    },

    updateLastWordTime: () => set((state) => ({
      combo: { ...state.combo, lastWordTime: Date.now() }
    })),

    // ==========================================
    // Tournament Actions
    // ==========================================

    setTournamentData: (value) => set((state) => ({
      tournamentData: applySetState(value, state.tournamentData)
    })),

    setTournamentStandings: (value) => set((state) => ({
      tournamentStandings: applySetState(value, state.tournamentStandings)
    })),

    setShowTournamentStandings: (value) => set((state) => ({
      showTournamentStandings: applySetState(value, state.showTournamentStandings)
    })),

    // ==========================================
    // XP/Level Actions
    // ==========================================

    setXpGainedData: (value) => set((state) => ({
      xpGainedData: applySetState(value, state.xpGainedData)
    })),

    setLevelUpData: (value) => set((state) => ({
      levelUpData: applySetState(value, state.levelUpData)
    })),

    // ==========================================
    // Board Theme Actions
    // ==========================================

    setBoardTheme: (value) => set((state) => ({
      boardTheme: applySetState(value, state.boardTheme)
    })),

    // ==========================================
    // Game Mode Actions
    // ==========================================

    setGameMode: (value) => set((state) => ({
      gameMode: applySetState(value, state.gameMode)
    })),

    // ==========================================
    // Blast Multiplayer Actions
    // ==========================================

    setBlastTileOverlay: (value) => set((state) => ({
      blastTileOverlay: applySetState(value, state.blastTileOverlay)
    })),

    setBlastMovesUsed: (value) => set((state) => ({
      blastMovesUsed: applySetState(value, state.blastMovesUsed)
    })),

    setBlastSeed: (value) => set((state) => ({
      blastSeed: applySetState(value, state.blastSeed)
    })),

    setBlastComboSync: (value) => set({ blastComboSync: value }),

    // ==========================================
    // Word Hunt Multiplayer Actions
    // ==========================================

    setWordHuntTargetLength: (value) => set((state) => ({
      wordHuntTargetLength: applySetState(value, state.wordHuntTargetLength)
    })),

    setWordHuntMyLife: (value) => set((state) => ({
      wordHuntMyLife: applySetState(value, state.wordHuntMyLife)
    })),

    setWordHuntPlayerLives: (value) => set((state) => ({
      wordHuntPlayerLives: applySetState(value, state.wordHuntPlayerLives)
    })),

    setWordHuntTargetAttempts: (value) => set((state) => ({
      wordHuntTargetAttempts: applySetState(value, state.wordHuntTargetAttempts)
    })),

    setWordHuntTargetFound: (value) => set((state) => ({
      wordHuntTargetFound: applySetState(value, state.wordHuntTargetFound)
    })),

    setWordHuntEliminatedPlayers: (value) => set((state) => ({
      wordHuntEliminatedPlayers: applySetState(value, state.wordHuntEliminatedPlayers)
    })),

    addWordHuntDiscoveryClues: (greens, known) => set((state) => {
      // Merge new green positions (deduplicate by position)
      const existingPositions = new Set(state.wordHuntDiscoveryClues.map(c => c.position));
      const newGreens = greens.filter(g => !existingPositions.has(g.position));
      const mergedClues = [...state.wordHuntDiscoveryClues, ...newGreens];

      // Merge known letters (deduplicate)
      const existingKnown = new Set(state.wordHuntKnownLetters);
      const newKnown = known.filter(l => !existingKnown.has(l));
      const mergedKnown = [...state.wordHuntKnownLetters, ...newKnown];

      return {
        wordHuntDiscoveryClues: mergedClues,
        wordHuntKnownLetters: mergedKnown,
      };
    }),

    // ==========================================
    // Batch Actions (performance: single set() call)
    // ==========================================

    batchStartGame: (data) => {
      set((state) => ({
        ...state,
        foundWords: [],
        achievements: [],
        ...(data.letterGrid !== undefined && { letterGrid: data.letterGrid }),
        ...(data.remainingTime !== undefined && { remainingTime: data.remainingTime }),
        ...(data.gameLanguage !== undefined && { gameLanguage: data.gameLanguage }),
        ...(data.minWordLength !== undefined && { minWordLength: data.minWordLength }),
        ...(data.boardTheme !== undefined && { boardTheme: data.boardTheme }),
        ...(data.gameMode !== undefined && { gameMode: data.gameMode }),
        ...(data.blastTileOverlay !== undefined && { blastTileOverlay: data.blastTileOverlay }),
        ...(data.blastMovesUsed !== undefined && { blastMovesUsed: data.blastMovesUsed }),
        ...(data.blastSeed !== undefined && { blastSeed: data.blastSeed }),
        ...(data.wordHuntTargetLength !== undefined && { wordHuntTargetLength: data.wordHuntTargetLength }),
        ...(data.wordHuntMyLife !== undefined && { wordHuntMyLife: data.wordHuntMyLife }),
        ...(data.showStartAnimation !== undefined && { showStartAnimation: data.showStartAnimation }),
        ...(data.gameActive !== undefined && { gameActive: data.gameActive }),
        // Reset word hunt state if target length is set
        ...(data.wordHuntTargetLength !== undefined && {
          wordHuntPlayerLives: {},
          wordHuntTargetAttempts: [],
          wordHuntTargetFound: false,
          wordHuntDiscoveryClues: [],
          wordHuntKnownLetters: [],
        }),
      }));
    },

    batchResetGame: () => {
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
        _comboTimeoutId = null;
      }
      set({
        gameActive: false,
        letterGrid: null,
        remainingTime: null,
        showStartAnimation: false,
        shufflingGrid: null,
        waitingForResults: false,
        foundWords: [],
        achievements: [],
        totalBoardWords: null,
        tournamentData: null,
        tournamentStandings: [],
        showTournamentStandings: false,
        xpGainedData: null,
        levelUpData: null,
        wordHuntEliminatedPlayers: [],
        wordHuntTargetFound: false,
        wordHuntTargetAttempts: [],
        wordHuntPlayerLives: {},
        wordHuntMyLife: 100,
        wordHuntDiscoveryClues: [],
        wordHuntKnownLetters: [],
        combo: DEFAULT_COMBO_STATE,
      });
    },

    // ==========================================
    // Reset Actions
    // ==========================================

    resetForNewRound: () => {
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
        _comboTimeoutId = null;
      }
      set({
        gameActive: false,
        letterGrid: null,
        remainingTime: null,
        totalBoardWords: null,
        foundWords: [],
        achievements: [],
        waitingForResults: false,
        showStartAnimation: false,
        shufflingGrid: null,
        highlightedCells: [],
        combo: DEFAULT_COMBO_STATE,
        leaderboard: [],
        xpGainedData: null,
        levelUpData: null,
        blastTileOverlay: [],
        blastMovesUsed: 0,
        blastSeed: null,
        blastComboSync: null,
        wordHuntTargetLength: 0,
        wordHuntMyLife: 100,
        wordHuntPlayerLives: {},
        wordHuntTargetAttempts: [],
        wordHuntTargetFound: false,
        wordHuntEliminatedPlayers: [],
        wordHuntDiscoveryClues: [],
        wordHuntKnownLetters: [],
      });
    },

    resetAll: () => {
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
        _comboTimeoutId = null;
      }
      set(initialState);
    },
  }))
);

// ==========================================
// Selector Hooks (for cleaner API and maximum performance)
// ==========================================

// These hooks subscribe to only the specific slice they need,
// so components only re-render when that slice changes.

// Core game selectors
export const useGameActive = () => useGameStore((state) => state.gameActive);
export const useLetterGrid = () => useGameStore((state) => state.letterGrid);
export const useRemainingTime = () => useGameStore((state) => state.remainingTime);
export const useGameLanguage = () => useGameStore((state) => state.gameLanguage);
export const useMinWordLength = () => useGameStore((state) => state.minWordLength);
export const useTotalBoardWords = () => useGameStore((state) => state.totalBoardWords);

// Player selectors
export const usePlayers = () => useGameStore((state) => state.players);
export const useLeaderboard = () => useGameStore((state) => state.leaderboard);

// Word selectors
export const useFoundWords = () => useGameStore((state) => state.foundWords);
export const useAchievements = () => useGameStore((state) => state.achievements);

// UI selectors
export const useWaitingForResults = () => useGameStore((state) => state.waitingForResults);
export const useShowStartAnimation = () => useGameStore((state) => state.showStartAnimation);
export const useShufflingGrid = () => useGameStore((state) => state.shufflingGrid);
export const useHighlightedCells = () => useGameStore((state) => state.highlightedCells);

// Combo selectors
export const useCombo = () => useGameStore((state) => state.combo);
export const useComboLevel = () => useGameStore((state) => state.combo.level);

// Tournament selectors
export const useTournamentData = () => useGameStore((state) => state.tournamentData);
export const useTournamentStandings = () => useGameStore((state) => state.tournamentStandings);
export const useShowTournamentStandings = () => useGameStore((state) => state.showTournamentStandings);

// XP/Level selectors
export const useXpGainedData = () => useGameStore((state) => state.xpGainedData);
export const useLevelUpData = () => useGameStore((state) => state.levelUpData);

// Board theme selector
export const useBoardTheme = () => useGameStore((state) => state.boardTheme);

// Game mode selector
export const useGameMode = () => useGameStore((state) => state.gameMode);

// Blast multiplayer selectors
export const useBlastTileOverlay = () => useGameStore((state) => state.blastTileOverlay);
export const useBlastMovesUsed = () => useGameStore((state) => state.blastMovesUsed);
export const useBlastSeed = () => useGameStore((state) => state.blastSeed);
export const useBlastComboSync = () => useGameStore((state) => state.blastComboSync);

// Word Hunt multiplayer selectors
export const useWordHuntTargetLength = () => useGameStore((state) => state.wordHuntTargetLength);
export const useWordHuntMyLife = () => useGameStore((state) => state.wordHuntMyLife);
export const useWordHuntPlayerLives = () => useGameStore((state) => state.wordHuntPlayerLives);
export const useWordHuntTargetAttempts = () => useGameStore((state) => state.wordHuntTargetAttempts);
export const useWordHuntTargetFound = () => useGameStore((state) => state.wordHuntTargetFound);
export const useWordHuntEliminatedPlayers = () => useGameStore((state) => state.wordHuntEliminatedPlayers);
export const useWordHuntDiscoveryClues = () => useGameStore((state) => state.wordHuntDiscoveryClues);
export const useWordHuntKnownLetters = () => useGameStore((state) => state.wordHuntKnownLetters);

// ==========================================
// Actions Object (static, no re-renders)
// ==========================================

// CRITICAL FIX for React Error #185 (Maximum update depth exceeded):
// Instead of using a selector that creates a new object on every call,
// we extract actions once as a static object. Zustand actions are stable
// (they don't change), so we can safely cache them.
//
// Old approach (causes infinite loop):
// export const useGameActions = () => useGameStore((state) => ({ ...actions }), shallow);
// ^ This creates new object every call, causing useEffect deps to re-trigger
//
// New approach (stable reference):
// Get actions from store once, return the same object reference always
const getActions = (state: GameStore) => ({
  setGameActive: state.setGameActive,
  setLetterGrid: state.setLetterGrid,
  setRemainingTime: state.setRemainingTime,
  setGameLanguage: state.setGameLanguage,
  setMinWordLength: state.setMinWordLength,
  setTotalBoardWords: state.setTotalBoardWords,
  setPlayers: state.setPlayers,
  updatePlayer: state.updatePlayer,
  addPlayer: state.addPlayer,
  removePlayer: state.removePlayer,
  setLeaderboard: state.setLeaderboard,
  addFoundWord: state.addFoundWord,
  setFoundWords: state.setFoundWords,
  addAchievement: state.addAchievement,
  setAchievements: state.setAchievements,
  setWaitingForResults: state.setWaitingForResults,
  setShowStartAnimation: state.setShowStartAnimation,
  setShufflingGrid: state.setShufflingGrid,
  setHighlightedCells: state.setHighlightedCells,
  incrementCombo: state.incrementCombo,
  resetCombo: state.resetCombo,
  useComboShield: state.useComboShield,
  updateLastWordTime: state.updateLastWordTime,
  setTournamentData: state.setTournamentData,
  setTournamentStandings: state.setTournamentStandings,
  setShowTournamentStandings: state.setShowTournamentStandings,
  setXpGainedData: state.setXpGainedData,
  setLevelUpData: state.setLevelUpData,
  setBoardTheme: state.setBoardTheme,
  setGameMode: state.setGameMode,
  setBlastTileOverlay: state.setBlastTileOverlay,
  setBlastMovesUsed: state.setBlastMovesUsed,
  setBlastSeed: state.setBlastSeed,
  setBlastComboSync: state.setBlastComboSync,
  setWordHuntTargetLength: state.setWordHuntTargetLength,
  setWordHuntMyLife: state.setWordHuntMyLife,
  setWordHuntPlayerLives: state.setWordHuntPlayerLives,
  setWordHuntTargetAttempts: state.setWordHuntTargetAttempts,
  setWordHuntTargetFound: state.setWordHuntTargetFound,
  setWordHuntEliminatedPlayers: state.setWordHuntEliminatedPlayers,
  addWordHuntDiscoveryClues: state.addWordHuntDiscoveryClues,
  batchStartGame: state.batchStartGame,
  batchResetGame: state.batchResetGame,
  resetForNewRound: state.resetForNewRound,
  resetAll: state.resetAll,
});

// Cache the actions object - it never changes since Zustand actions are stable
let cachedActions: ReturnType<typeof getActions> | null = null;

/**
 * Get game actions (stable reference, never causes re-renders)
 *
 * This hook returns a stable object containing all store actions.
 * Unlike state selectors, actions don't change, so we cache the result.
 */
export const useGameActions = () => {
  if (!cachedActions) {
    cachedActions = getActions(useGameStore.getState());
  }
  return cachedActions;
};
