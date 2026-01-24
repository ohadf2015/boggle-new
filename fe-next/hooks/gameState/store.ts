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
import { shallow } from 'zustand/shallow';
import type { LetterGrid, LeaderboardEntry, Language, WordDetail } from '@/shared/types/game';
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

  // Internal refs (not reactive, for callbacks)
  _comboTimeoutId: NodeJS.Timeout | null;
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
  _comboTimeoutId: null,
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
      if (state._comboTimeoutId) {
        clearTimeout(state._comboTimeoutId);
      }

      // Set new timeout for combo reset
      const timeoutId = setTimeout(() => {
        set({ combo: { ...get().combo, level: 0 }, _comboTimeoutId: null });
      }, COMBO_TIMEOUT_MS);

      set({
        combo: {
          ...state.combo,
          level: state.combo.level + 1,
          lastWordTime: Date.now(),
        },
        _comboTimeoutId: timeoutId,
      });
    },

    resetCombo: () => {
      const state = get();
      if (state._comboTimeoutId) {
        clearTimeout(state._comboTimeoutId);
      }
      set({
        combo: { ...state.combo, level: 0 },
        _comboTimeoutId: null,
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
    // Reset Actions
    // ==========================================

    resetForNewRound: () => {
      const state = get();
      if (state._comboTimeoutId) {
        clearTimeout(state._comboTimeoutId);
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
        _comboTimeoutId: null,
      });
    },

    resetAll: () => {
      const state = get();
      if (state._comboTimeoutId) {
        clearTimeout(state._comboTimeoutId);
      }
      set({ ...initialState, _comboTimeoutId: null });
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
