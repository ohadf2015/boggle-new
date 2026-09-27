/**
 * Zustand Game State Store
 *
 * Replaces Context + useReducer with Zustand for selective re-renders.
 * Selectors and actions are in selectors.ts, types in storeTypes.ts.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ComboState } from './types';
import type { GameState, GameActions } from './storeTypes';
// COMBO_SHIELD_INTERVAL removed — useComboShield was dead code (player flow uses local refs)

// ==========================================
// Constants & Types
// ==========================================

const COMBO_TIMEOUT_MS = 8000;

const DEFAULT_COMBO_STATE: ComboState = {
  level: 0,
  lastWordTime: null,
  shieldsUsed: 0,
};

export type GameStore = GameState & GameActions;

// Module-level variable for combo timeout — NOT in Zustand state to avoid re-renders
let _comboTimeoutId: NodeJS.Timeout | null = null;

const initialState: GameState = {
  gameActive: false,
  letterGrid: null,
  remainingTime: null,
  gameDuration: null,
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
  gameModeConfirmed: false,
  hostSelectedGameMode: 'random',
  blastTileOverlay: [],
  blastBoardClears: 0,
  blastTotalTileBonus: 0,
  blastTotalTilesCleared: 0,
  blastSeed: null,
  blastComboSync: null,
  blastOpponentActivity: [],
  blastPlayerStats: {},
  wheelRushPlayerStats: {},
  blastBoardUpdate: null,
  wordHuntTargetLength: 0,
  wordHuntTargetCategory: null as string | null,
  wordHuntMyLife: 100,
  wordHuntPlayerLives: {},
  wordHuntTargetAttempts: [],
  wordHuntTargetFound: false,
  wordHuntTargetFoundBy: null,
  wordHuntEliminatedPlayers: [],
  wordHuntDiscoveryClues: [],
  wordHuntKnownLetters: [],
  blastBoardClearedByLocal: false,
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

    setGameDuration: (value) => set({ gameDuration: value }),

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

    updatePlayer: (username, updates) => set((state) => {
      const idx = state.players.findIndex(p => p.username === username);
      if (idx === -1) return state;
      // Skip update when all values are identical (avoids ~5x/sec garbage array creation)
      const current = state.players[idx];
      const keys = Object.keys(updates) as (keyof typeof updates)[];
      if (keys.every(k => current[k] === updates[k])) return state;
      const next = [...state.players];
      next[idx] = { ...current, ...updates };
      return { players: next };
    }),

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

    setLeaderboard: (value) => set((state) => {
      const next = applySetState(value, state.leaderboard);
      // Skip update if leaderboard entries are identical (prevents cascading re-renders)
      if (
        next.length === state.leaderboard.length &&
        next.every((p, i) => {
          const prev = state.leaderboard[i];
          return prev && p.username === prev.username && p.score === prev.score;
        })
      ) {
        return state;
      }
      return { leaderboard: next };
    }),

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

    // NOTE: useComboShield removed — dead code. Player flow uses local ref system in PlayerView.tsx.
    // combo.level in this store is used by HOST flow only.

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

    // Tentative client-side selection (URL ?mode= param, host lobby picker). Sets the
    // mode but leaves gameModeConfirmed FALSE — only the server's startGame payload
    // (confirmGameMode / batchStartGame) may open the in-game render gate. Otherwise an
    // optimistic/stale mode renders and visibly swaps when the real mode arrives.
    setGameMode: (value) => set((state) => ({
      gameMode: applySetState(value, state.gameMode),
      gameModeConfirmed: false,
    })),

    // Authoritative server confirmation: set the resolved concrete mode AND open the
    // gate in one atomic update, so the mode-specific view mounts already correct.
    confirmGameMode: (mode) => set(() => ({
      gameMode: mode,
      gameModeConfirmed: true,
    })),

    setHostSelectedGameMode: (value) => set((state) => ({
      hostSelectedGameMode: applySetState(value, state.hostSelectedGameMode)
    })),

    // ==========================================
    // Blast Multiplayer Actions
    // ==========================================

    setBlastTileOverlay: (value) => set((state) => ({
      blastTileOverlay: applySetState(value, state.blastTileOverlay)
    })),

    setBlastBoardClears: (value) => set((state) => ({
      blastBoardClears: applySetState(value, state.blastBoardClears)
    })),

    setBlastTotalTileBonus: (value) => set((state) => ({
      blastTotalTileBonus: applySetState(value, state.blastTotalTileBonus)
    })),

    setBlastTotalTilesCleared: (value) => set((state) => ({
      blastTotalTilesCleared: applySetState(value, state.blastTotalTilesCleared)
    })),

    setBlastSeed: (value) => set((state) => ({
      blastSeed: applySetState(value, state.blastSeed)
    })),

    setBlastComboSync: (value) => set({ blastComboSync: value }),

    pushBlastOpponentActivity: (event) => set((state) => ({
      blastOpponentActivity: [...state.blastOpponentActivity.slice(-4), event],
    })),

    setBlastPlayerStats: (value) => set((state) => ({
      blastPlayerStats: applySetState(value, state.blastPlayerStats)
    })),

    setWheelRushPlayerStats: (value) => set((state) => ({
      wheelRushPlayerStats: applySetState(value, state.wheelRushPlayerStats)
    })),

    setBlastBoardUpdate: (value) => set({ blastBoardUpdate: value }),

    setBlastBoardClearedByLocal: (value) => set((state) => ({
      blastBoardClearedByLocal: applySetState(value, state.blastBoardClearedByLocal)
    })),

    // ==========================================
    // Word Hunt Multiplayer Actions
    // ==========================================

    setWordHuntTargetLength: (value) => set((state) => ({
      wordHuntTargetLength: applySetState(value, state.wordHuntTargetLength)
    })),
    setWordHuntTargetCategory: (value: string | null) => set(() => ({
      wordHuntTargetCategory: value
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

    setWordHuntTargetFoundBy: (value) => set({ wordHuntTargetFoundBy: value }),

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
      // Clear combo timeout to prevent stale timer from previous game
      if (_comboTimeoutId) {
        clearTimeout(_comboTimeoutId);
        _comboTimeoutId = null;
      }
      // Full reset first, then apply explicit overrides — prevents stale state bleed.
      // `hostSelectedGameMode` is the host's persistent intent (can be 'random') and
      // must survive the reset so random mode re-rolls each round instead of locking
      // to the previously resolved mode.
      const preservedHostSelectedGameMode = get().hostSelectedGameMode;
      set(() => ({
        ...initialState,
        combo: DEFAULT_COMBO_STATE,
        hostSelectedGameMode: preservedHostSelectedGameMode,
        gameModeConfirmed: true,
        ...(data.letterGrid !== undefined && { letterGrid: data.letterGrid }),
        ...(data.remainingTime !== undefined && { remainingTime: data.remainingTime, gameDuration: data.remainingTime }),
        ...(data.gameLanguage !== undefined && { gameLanguage: data.gameLanguage }),
        ...(data.minWordLength !== undefined && { minWordLength: data.minWordLength }),
        ...(data.boardTheme !== undefined && { boardTheme: data.boardTheme }),
        ...(data.gameMode !== undefined && { gameMode: data.gameMode }),
        ...(data.blastTileOverlay !== undefined && { blastTileOverlay: data.blastTileOverlay }),
        ...(data.blastSeed !== undefined && { blastSeed: data.blastSeed }),
        ...(data.wordHuntTargetLength !== undefined && { wordHuntTargetLength: data.wordHuntTargetLength }),
        ...(data.wordHuntMyLife !== undefined && { wordHuntMyLife: data.wordHuntMyLife }),
        ...(data.showStartAnimation !== undefined && { showStartAnimation: data.showStartAnimation }),
        ...(data.gameActive !== undefined && { gameActive: data.gameActive }),
      }));
    },

    // NOTE: batchResetGame removed — never called. Use resetForNewRound or resetAll instead.

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
        // Re-gate mode rendering: next round must be re-confirmed by the server's
        // startGame payload before any mode-specific view mounts, so a stale mode
        // from the round that just ended can't flash on the next round's load.
        gameModeConfirmed: false,
        letterGrid: null,
        remainingTime: null,
        gameDuration: null,
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
        blastBoardClears: 0,
        blastTotalTileBonus: 0,
        blastTotalTilesCleared: 0,
        blastSeed: null,
        blastComboSync: null,
        blastOpponentActivity: [],
        blastPlayerStats: {},
        wheelRushPlayerStats: {},
        blastBoardUpdate: null,
        wordHuntTargetLength: 0,
        wordHuntTargetCategory: null,
        wordHuntMyLife: 100,
        wordHuntPlayerLives: {},
        wordHuntTargetAttempts: [],
        wordHuntTargetFound: false,
        wordHuntTargetFoundBy: null,
        wordHuntEliminatedPlayers: [],
        wordHuntDiscoveryClues: [],
        wordHuntKnownLetters: [],
        blastBoardClearedByLocal: false,
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

// Re-export selectors and actions for backward compatibility
// (many files import directly from './store' instead of the index)
export {
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
  useHostSelectedGameMode,
  useBlastTileOverlay,
  useBlastBoardClears,
  useBlastTotalTileBonus,
  useBlastTotalTilesCleared,
  useBlastSeed,
  useBlastComboSync,
  useBlastOpponentActivity,
  useBlastPlayerStats,
  useGameModeConfirmed,
  useWheelRushPlayerStats,
  useBlastBoardClearedByLocal,
  useWordHuntTargetLength,
  useWordHuntTargetCategory,
  useWordHuntMyLife,
  useWordHuntPlayerLives,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntTargetFoundBy,
  useWordHuntEliminatedPlayers,
  useWordHuntDiscoveryClues,
  useWordHuntKnownLetters,
  useGameActions,
} from './selectors';
