/**
 * useGameState - Centralized game state management hook
 *
 * This hook centralizes common game state used across PlayerView and HostView,
 * reducing prop drilling and ensuring consistent state management.
 *
 * Architecture Pattern: useReducer for predictable state updates
 */

import { useReducer, useCallback, useRef, useMemo } from 'react';
import type {
  LetterGrid,
  Avatar,
  Language,
  LeaderboardEntry,
  WordDetail,
} from '@/shared/types/game';

// ==========================================
// Type Definitions
// ==========================================

export interface Player {
  username: string;
  avatar: Avatar;
  isHost: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

export interface ComboState {
  level: number;
  lastWordTime: number | null;
  shieldsUsed: number;
}

export interface TournamentData {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

export interface TournamentStanding {
  rank: number;
  username: string;
  avatar: Avatar;
  totalScore: number;
  roundScores: number[];
}

export interface XpGainedData {
  totalXp: number;
  breakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
}

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  newTitles: string[];
}

export interface GameStateValues {
  // Core game state
  gameActive: boolean;
  letterGrid: LetterGrid | null;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;

  // Player state
  players: Player[];
  leaderboard: LeaderboardEntry[];

  // Word state
  foundWords: WordDetail[];
  achievements: string[];

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
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;
}

// ==========================================
// Action Types
// ==========================================

type GameStateAction =
  // Core game actions
  | { type: 'SET_GAME_ACTIVE'; payload: boolean }
  | { type: 'SET_LETTER_GRID'; payload: LetterGrid | null }
  | { type: 'SET_REMAINING_TIME'; payload: number | null }
  | { type: 'UPDATE_REMAINING_TIME'; payload: (prev: number | null) => number | null }
  | { type: 'SET_GAME_LANGUAGE'; payload: Language | null }
  | { type: 'SET_MIN_WORD_LENGTH'; payload: number }
  // Player actions
  | { type: 'SET_PLAYERS'; payload: Player[] | ((prev: Player[]) => Player[]) }
  | { type: 'UPDATE_PLAYER'; payload: { username: string; updates: Partial<Player> } }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'SET_LEADERBOARD'; payload: LeaderboardEntry[] }
  // Word actions
  | { type: 'ADD_FOUND_WORD'; payload: WordDetail }
  | { type: 'SET_FOUND_WORDS'; payload: WordDetail[] }
  | { type: 'ADD_ACHIEVEMENT'; payload: string }
  | { type: 'SET_ACHIEVEMENTS'; payload: string[] }
  // UI actions
  | { type: 'SET_WAITING_FOR_RESULTS'; payload: boolean }
  | { type: 'SET_SHOW_START_ANIMATION'; payload: boolean }
  | { type: 'SET_SHUFFLING_GRID'; payload: LetterGrid | null }
  | { type: 'SET_HIGHLIGHTED_CELLS'; payload: Array<{ row: number; col: number }> }
  // Combo actions
  | { type: 'INCREMENT_COMBO' }
  | { type: 'RESET_COMBO' }
  | { type: 'USE_COMBO_SHIELD' }
  | { type: 'UPDATE_LAST_WORD_TIME' }
  // Tournament actions
  | { type: 'SET_TOURNAMENT_DATA'; payload: TournamentData | null }
  | { type: 'SET_TOURNAMENT_STANDINGS'; payload: TournamentStanding[] }
  | { type: 'SET_SHOW_TOURNAMENT_STANDINGS'; payload: boolean }
  // XP/Level actions
  | { type: 'SET_XP_GAINED_DATA'; payload: XpGainedData | null }
  | { type: 'SET_LEVEL_UP_DATA'; payload: LevelUpData | null }
  // Reset actions
  | { type: 'RESET_FOR_NEW_ROUND' }
  | { type: 'RESET_ALL' };

// ==========================================
// Default Values
// ==========================================

const DEFAULT_COMBO_STATE: ComboState = {
  level: 0,
  lastWordTime: null,
  shieldsUsed: 0,
};

const INITIAL_STATE: GameStateValues = {
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
};

const COMBO_SHIELD_INTERVAL = 10; // Earn shield every 10 valid words

// ==========================================
// Reducer
// ==========================================

function gameStateReducer(state: GameStateValues, action: GameStateAction): GameStateValues {
  switch (action.type) {
    // Core game actions
    case 'SET_GAME_ACTIVE':
      return { ...state, gameActive: action.payload };
    case 'SET_LETTER_GRID':
      return { ...state, letterGrid: action.payload };
    case 'SET_REMAINING_TIME':
      return { ...state, remainingTime: action.payload };
    case 'UPDATE_REMAINING_TIME':
      return { ...state, remainingTime: action.payload(state.remainingTime) };
    case 'SET_GAME_LANGUAGE':
      return { ...state, gameLanguage: action.payload };
    case 'SET_MIN_WORD_LENGTH':
      return { ...state, minWordLength: action.payload };

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
      return { ...state, leaderboard: action.payload };

    // Word actions
    case 'ADD_FOUND_WORD': {
      const wordExists = state.foundWords.some(
        w => w.word.toLowerCase() === action.payload.word.toLowerCase()
      );
      if (wordExists) return state;
      return { ...state, foundWords: [...state.foundWords, action.payload] };
    }
    case 'SET_FOUND_WORDS':
      return { ...state, foundWords: action.payload };
    case 'ADD_ACHIEVEMENT':
      if (state.achievements.includes(action.payload)) return state;
      return { ...state, achievements: [...state.achievements, action.payload] };
    case 'SET_ACHIEVEMENTS':
      return { ...state, achievements: action.payload };

    // UI actions
    case 'SET_WAITING_FOR_RESULTS':
      return { ...state, waitingForResults: action.payload };
    case 'SET_SHOW_START_ANIMATION':
      return { ...state, showStartAnimation: action.payload };
    case 'SET_SHUFFLING_GRID':
      return { ...state, shufflingGrid: action.payload };
    case 'SET_HIGHLIGHTED_CELLS':
      return { ...state, highlightedCells: action.payload };

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
      return { ...state, tournamentData: action.payload };
    case 'SET_TOURNAMENT_STANDINGS':
      return { ...state, tournamentStandings: action.payload };
    case 'SET_SHOW_TOURNAMENT_STANDINGS':
      return { ...state, showTournamentStandings: action.payload };

    // XP/Level actions
    case 'SET_XP_GAINED_DATA':
      return { ...state, xpGainedData: action.payload };
    case 'SET_LEVEL_UP_DATA':
      return { ...state, levelUpData: action.payload };

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

// ==========================================
// Action Interfaces
// ==========================================

export interface GameStateActions {
  // Core game actions
  setGameActive: (active: boolean) => void;
  setLetterGrid: (grid: LetterGrid | null) => void;
  setRemainingTime: (time: number | null | ((prev: number | null) => number | null)) => void;
  setGameLanguage: (language: Language | null) => void;
  setMinWordLength: (length: number) => void;

  // Player actions
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  updatePlayer: (username: string, updates: Partial<Player>) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (username: string) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;

  // Word actions
  addFoundWord: (word: WordDetail) => void;
  setFoundWords: (words: WordDetail[]) => void;
  addAchievement: (achievement: string) => void;
  setAchievements: (achievements: string[]) => void;

  // UI actions
  setWaitingForResults: (waiting: boolean) => void;
  setShowStartAnimation: (show: boolean) => void;
  setShufflingGrid: (grid: LetterGrid | null) => void;
  setHighlightedCells: (cells: Array<{ row: number; col: number }>) => void;

  // Combo actions
  incrementCombo: () => void;
  resetCombo: () => void;
  useComboShield: () => boolean;
  updateLastWordTime: () => void;

  // Tournament actions
  setTournamentData: (data: TournamentData | null) => void;
  setTournamentStandings: (standings: TournamentStanding[]) => void;
  setShowTournamentStandings: (show: boolean) => void;

  // XP/Level actions
  setXpGainedData: (data: XpGainedData | null) => void;
  setLevelUpData: (data: LevelUpData | null) => void;

  // Reset actions
  resetForNewRound: () => void;
  resetAll: () => void;
}

export interface UseGameStateReturn extends GameStateValues, GameStateActions {
  // Refs for use in callbacks (avoid stale closures)
  refs: {
    comboLevel: React.MutableRefObject<number>;
    lastWordTime: React.MutableRefObject<number | null>;
    comboTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
  };
}

// ==========================================
// Constants
// ==========================================

const COMBO_TIMEOUT_MS = 8000; // 8 seconds to maintain combo

// ==========================================
// Hook Implementation
// ==========================================

export function useGameState(): UseGameStateReturn {
  const [state, dispatch] = useReducer(gameStateReducer, INITIAL_STATE);

  // Refs for use in callbacks
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  comboLevelRef.current = state.combo.level;
  lastWordTimeRef.current = state.combo.lastWordTime;

  // ==========================================
  // Action Creators
  // ==========================================

  const setGameActive = useCallback((active: boolean) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: active });
  }, []);

  const setLetterGrid = useCallback((grid: LetterGrid | null) => {
    dispatch({ type: 'SET_LETTER_GRID', payload: grid });
  }, []);

  const setRemainingTime = useCallback((time: number | null | ((prev: number | null) => number | null)) => {
    if (typeof time === 'function') {
      dispatch({ type: 'UPDATE_REMAINING_TIME', payload: time });
    } else {
      dispatch({ type: 'SET_REMAINING_TIME', payload: time });
    }
  }, []);

  const setGameLanguage = useCallback((language: Language | null) => {
    dispatch({ type: 'SET_GAME_LANGUAGE', payload: language });
  }, []);

  const setMinWordLength = useCallback((length: number) => {
    dispatch({ type: 'SET_MIN_WORD_LENGTH', payload: length });
  }, []);

  const setPlayers = useCallback((players: Player[] | ((prev: Player[]) => Player[])) => {
    dispatch({ type: 'SET_PLAYERS', payload: players });
  }, []);

  const updatePlayer = useCallback((username: string, updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PLAYER', payload: { username, updates } });
  }, []);

  const addPlayer = useCallback((player: Player) => {
    dispatch({ type: 'ADD_PLAYER', payload: player });
  }, []);

  const removePlayer = useCallback((username: string) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: username });
  }, []);

  const setLeaderboard = useCallback((entries: LeaderboardEntry[]) => {
    dispatch({ type: 'SET_LEADERBOARD', payload: entries });
  }, []);

  const addFoundWord = useCallback((word: WordDetail) => {
    dispatch({ type: 'ADD_FOUND_WORD', payload: word });
  }, []);

  const setFoundWords = useCallback((words: WordDetail[]) => {
    dispatch({ type: 'SET_FOUND_WORDS', payload: words });
  }, []);

  const addAchievement = useCallback((achievement: string) => {
    dispatch({ type: 'ADD_ACHIEVEMENT', payload: achievement });
  }, []);

  const setAchievements = useCallback((achievements: string[]) => {
    dispatch({ type: 'SET_ACHIEVEMENTS', payload: achievements });
  }, []);

  const setWaitingForResults = useCallback((waiting: boolean) => {
    dispatch({ type: 'SET_WAITING_FOR_RESULTS', payload: waiting });
  }, []);

  const setShowStartAnimation = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_START_ANIMATION', payload: show });
  }, []);

  const setShufflingGrid = useCallback((grid: LetterGrid | null) => {
    dispatch({ type: 'SET_SHUFFLING_GRID', payload: grid });
  }, []);

  const setHighlightedCells = useCallback((cells: Array<{ row: number; col: number }>) => {
    dispatch({ type: 'SET_HIGHLIGHTED_CELLS', payload: cells });
  }, []);

  const incrementCombo = useCallback(() => {
    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    dispatch({ type: 'INCREMENT_COMBO' });

    // Set new timeout to reset combo
    comboTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'RESET_COMBO' });
    }, COMBO_TIMEOUT_MS);
  }, []);

  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_COMBO' });
  }, []);

  const useComboShield = useCallback((): boolean => {
    // Check if player has earned a shield (1 per 10 valid words)
    const validWordCount = state.foundWords.filter(w => w.validated !== false).length;
    const availableShields = Math.floor(validWordCount / COMBO_SHIELD_INTERVAL);

    if (state.combo.shieldsUsed < availableShields) {
      dispatch({ type: 'USE_COMBO_SHIELD' });
      return true; // Shield used successfully
    }
    return false; // No shield available
  }, [state.foundWords, state.combo.shieldsUsed]);

  const updateLastWordTime = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_WORD_TIME' });
  }, []);

  const setTournamentData = useCallback((data: TournamentData | null) => {
    dispatch({ type: 'SET_TOURNAMENT_DATA', payload: data });
  }, []);

  const setTournamentStandings = useCallback((standings: TournamentStanding[]) => {
    dispatch({ type: 'SET_TOURNAMENT_STANDINGS', payload: standings });
  }, []);

  const setShowTournamentStandings = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_TOURNAMENT_STANDINGS', payload: show });
  }, []);

  const setXpGainedData = useCallback((data: XpGainedData | null) => {
    dispatch({ type: 'SET_XP_GAINED_DATA', payload: data });
  }, []);

  const setLevelUpData = useCallback((data: LevelUpData | null) => {
    dispatch({ type: 'SET_LEVEL_UP_DATA', payload: data });
  }, []);

  const resetForNewRound = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_FOR_NEW_ROUND' });
  }, []);

  const resetAll = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // ==========================================
  // Return Value
  // ==========================================

  return useMemo(() => ({
    // State values (spread from reducer state)
    ...state,

    // Actions
    setGameActive,
    setLetterGrid,
    setRemainingTime,
    setGameLanguage,
    setMinWordLength,
    setPlayers,
    updatePlayer,
    addPlayer,
    removePlayer,
    setLeaderboard,
    addFoundWord,
    setFoundWords,
    addAchievement,
    setAchievements,
    setWaitingForResults,
    setShowStartAnimation,
    setShufflingGrid,
    setHighlightedCells,
    incrementCombo,
    resetCombo,
    useComboShield,
    updateLastWordTime,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setXpGainedData,
    setLevelUpData,
    resetForNewRound,
    resetAll,

    // Refs
    refs: {
      comboLevel: comboLevelRef,
      lastWordTime: lastWordTimeRef,
      comboTimeout: comboTimeoutRef,
    },
  }), [
    state,
    setGameActive,
    setLetterGrid,
    setRemainingTime,
    setGameLanguage,
    setMinWordLength,
    setPlayers,
    updatePlayer,
    addPlayer,
    removePlayer,
    setLeaderboard,
    addFoundWord,
    setFoundWords,
    addAchievement,
    setAchievements,
    setWaitingForResults,
    setShowStartAnimation,
    setShufflingGrid,
    setHighlightedCells,
    incrementCombo,
    resetCombo,
    useComboShield,
    updateLastWordTime,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setXpGainedData,
    setLevelUpData,
    resetForNewRound,
    resetAll,
  ]);
}

export default useGameState;
