/**
 * Game state reducer for useGameState hook
 */

import { COMBO_SHIELD_INTERVAL } from '@/utils/consts';
import type { GameStateValues, GameStateAction, ComboState } from './types';

// ==========================================
// Default Values
// ==========================================

export const DEFAULT_COMBO_STATE: ComboState = {
  level: 0,
  lastWordTime: null,
  shieldsUsed: 0,
};

export const INITIAL_STATE: GameStateValues = {
  gameActive: false,
  letterGrid: null,
  remainingTime: null,
  gameLanguage: null,
  minWordLength: 2,
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
  totalBoardWords: null,
};

// ==========================================
// Reducer
// ==========================================

export function gameStateReducer(state: GameStateValues, action: GameStateAction): GameStateValues {
  switch (action.type) {
    // Core game actions
    case 'SET_GAME_ACTIVE':
      return {
        ...state,
        gameActive: typeof action.payload === 'function'
          ? action.payload(state.gameActive)
          : action.payload
      };
    case 'SET_LETTER_GRID':
      return {
        ...state,
        letterGrid: typeof action.payload === 'function'
          ? action.payload(state.letterGrid)
          : action.payload
      };
    case 'SET_REMAINING_TIME':
      return {
        ...state,
        remainingTime: typeof action.payload === 'function'
          ? action.payload(state.remainingTime)
          : action.payload
      };
    case 'UPDATE_REMAINING_TIME':
      return { ...state, remainingTime: action.payload(state.remainingTime) };
    case 'SET_GAME_LANGUAGE':
      return {
        ...state,
        gameLanguage: typeof action.payload === 'function'
          ? action.payload(state.gameLanguage)
          : action.payload
      };
    case 'SET_MIN_WORD_LENGTH':
      return {
        ...state,
        minWordLength: typeof action.payload === 'function'
          ? action.payload(state.minWordLength)
          : action.payload
      };

    // Player actions
    case 'SET_PLAYERS':
      return {
        ...state,
        players: typeof action.payload === 'function' ? action.payload(state.players) : action.payload,
      };
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p =>
          p.username === action.payload.username ? { ...p, ...action.payload.updates } : p
        ),
      };
    case 'ADD_PLAYER': {
      const existingIndex = state.players.findIndex(p => p.username === action.payload.username);
      if (existingIndex >= 0) {
        const updatedPlayers = [...state.players];
        updatedPlayers[existingIndex] = { ...updatedPlayers[existingIndex], ...action.payload };
        return { ...state, players: updatedPlayers };
      }
      return { ...state, players: [...state.players, action.payload] };
    }
    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.username !== action.payload) };
    case 'SET_LEADERBOARD':
      return {
        ...state,
        leaderboard: typeof action.payload === 'function'
          ? action.payload(state.leaderboard)
          : action.payload
      };

    // Word actions
    case 'ADD_FOUND_WORD': {
      const wordExists = state.foundWords.some(
        w => w.word.toLowerCase() === action.payload.word.toLowerCase()
      );
      if (wordExists) return state;
      return { ...state, foundWords: [...state.foundWords, action.payload] };
    }
    case 'SET_FOUND_WORDS':
      return {
        ...state,
        foundWords: typeof action.payload === 'function'
          ? action.payload(state.foundWords)
          : action.payload
      };
    case 'ADD_ACHIEVEMENT':
      if (state.achievements.some(a => a.key === action.payload.key)) return state;
      return { ...state, achievements: [...state.achievements, action.payload] };
    case 'SET_ACHIEVEMENTS':
      return {
        ...state,
        achievements: typeof action.payload === 'function'
          ? action.payload(state.achievements)
          : action.payload
      };

    // UI actions
    case 'SET_WAITING_FOR_RESULTS':
      return {
        ...state,
        waitingForResults: typeof action.payload === 'function'
          ? action.payload(state.waitingForResults)
          : action.payload
      };
    case 'SET_SHOW_START_ANIMATION':
      return {
        ...state,
        showStartAnimation: typeof action.payload === 'function'
          ? action.payload(state.showStartAnimation)
          : action.payload
      };
    case 'SET_SHUFFLING_GRID':
      return {
        ...state,
        shufflingGrid: typeof action.payload === 'function'
          ? action.payload(state.shufflingGrid)
          : action.payload
      };
    case 'SET_HIGHLIGHTED_CELLS':
      return {
        ...state,
        highlightedCells: typeof action.payload === 'function'
          ? action.payload(state.highlightedCells)
          : action.payload
      };

    // Combo actions
    case 'INCREMENT_COMBO':
      return {
        ...state,
        combo: {
          ...state.combo,
          level: state.combo.level + 1,
          lastWordTime: Date.now(),
        },
      };
    case 'RESET_COMBO':
      return { ...state, combo: { ...state.combo, level: 0 } };
    case 'USE_COMBO_SHIELD': {
      const validWordCount = state.foundWords.filter(w => w.validated !== false).length;
      const availableShields = Math.floor(validWordCount / COMBO_SHIELD_INTERVAL);
      if (state.combo.shieldsUsed < availableShields) {
        return { ...state, combo: { ...state.combo, shieldsUsed: state.combo.shieldsUsed + 1 } };
      }
      return state;
    }
    case 'UPDATE_LAST_WORD_TIME':
      return { ...state, combo: { ...state.combo, lastWordTime: Date.now() } };

    // Tournament actions
    case 'SET_TOURNAMENT_DATA':
      return {
        ...state,
        tournamentData: typeof action.payload === 'function'
          ? action.payload(state.tournamentData)
          : action.payload
      };
    case 'SET_TOURNAMENT_STANDINGS':
      return {
        ...state,
        tournamentStandings: typeof action.payload === 'function'
          ? action.payload(state.tournamentStandings)
          : action.payload
      };
    case 'SET_SHOW_TOURNAMENT_STANDINGS':
      return {
        ...state,
        showTournamentStandings: typeof action.payload === 'function'
          ? action.payload(state.showTournamentStandings)
          : action.payload
      };

    // XP/Level actions
    case 'SET_XP_GAINED_DATA':
      return {
        ...state,
        xpGainedData: typeof action.payload === 'function'
          ? action.payload(state.xpGainedData)
          : action.payload
      };
    case 'SET_LEVEL_UP_DATA':
      return {
        ...state,
        levelUpData: typeof action.payload === 'function'
          ? action.payload(state.levelUpData)
          : action.payload
      };

    // Board theme actions
    case 'SET_BOARD_THEME':
      return {
        ...state,
        boardTheme: typeof action.payload === 'function'
          ? action.payload(state.boardTheme)
          : action.payload
      };

    // Total board words actions
    case 'SET_TOTAL_BOARD_WORDS':
      return {
        ...state,
        totalBoardWords: typeof action.payload === 'function'
          ? action.payload(state.totalBoardWords)
          : action.payload
      };

    // Reset actions
    case 'RESET_FOR_NEW_ROUND':
      return {
        ...state,
        gameActive: false,
        letterGrid: null,
        remainingTime: null,
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
      };
    case 'RESET_ALL':
      return INITIAL_STATE;

    default:
      return state;
  }
}
