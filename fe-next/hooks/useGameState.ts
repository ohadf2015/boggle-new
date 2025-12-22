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
import type { XpGainedPayload, LevelUpPayload, AchievementPayload } from '@/shared/types/socket';
import { COMBO_SHIELD_INTERVAL } from '@/utils/consts';

// ==========================================
// Type Definitions
// ==========================================

export interface Player {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
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

// XP and Level types are now imported from @/shared/types/socket
// export type XpGainedData = XpGainedPayload;
// export type LevelUpData = LevelUpPayload;

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
  | { type: 'ADD_ACHIEVEMENT'; payload: AchievementPayload }
  | { type: 'SET_ACHIEVEMENTS'; payload: AchievementPayload[] }
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
  | { type: 'SET_XP_GAINED_DATA'; payload: XpGainedPayload | null }
  | { type: 'SET_LEVEL_UP_DATA'; payload: LevelUpPayload | null }
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
      if (state.achievements.some(a => a.key === action.payload.key)) return state;
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
  setGameActive: React.Dispatch<React.SetStateAction<boolean>>;
  setLetterGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setGameLanguage: React.Dispatch<React.SetStateAction<Language | null>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;

  // Player actions
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  updatePlayer: (username: string, updates: Partial<Player>) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (username: string) => void;
  setLeaderboard: React.Dispatch<React.SetStateAction<LeaderboardEntry[]>>;

  // Word actions
  addFoundWord: (word: WordDetail) => void;
  setFoundWords: React.Dispatch<React.SetStateAction<WordDetail[]>>;
  addAchievement: (achievement: AchievementPayload) => void;
  setAchievements: React.Dispatch<React.SetStateAction<AchievementPayload[]>>;

  // UI actions
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setHighlightedCells: React.Dispatch<React.SetStateAction<Array<{ row: number; col: number }>>>;

  // Combo actions
  incrementCombo: () => void;
  resetCombo: () => void;
  useComboShield: () => boolean;
  updateLastWordTime: () => void;

  // Tournament actions
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentStandings: React.Dispatch<React.SetStateAction<TournamentStanding[]>>;
  setShowTournamentStandings: React.Dispatch<React.SetStateAction<boolean>>;

  // XP/Level actions
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

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

  const setGameActive = useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(state.gameActive) : value;
    dispatch({ type: 'SET_GAME_ACTIVE', payload: newValue });
  }, [state.gameActive]);

  const setLetterGrid = useCallback((value: React.SetStateAction<LetterGrid | null>) => {
    const newValue = typeof value === 'function' ? value(state.letterGrid) : value;
    dispatch({ type: 'SET_LETTER_GRID', payload: newValue });
  }, [state.letterGrid]);

  const setRemainingTime = useCallback((value: React.SetStateAction<number | null>) => {
    const newValue = typeof value === 'function' ? value(state.remainingTime) : value;
    dispatch({ type: 'SET_REMAINING_TIME', payload: newValue });
  }, [state.remainingTime]);

  const setGameLanguage = useCallback((value: React.SetStateAction<Language | null>) => {
    const newValue = typeof value === 'function' ? value(state.gameLanguage) : value;
    dispatch({ type: 'SET_GAME_LANGUAGE', payload: newValue });
  }, [state.gameLanguage]);

  const setMinWordLength = useCallback((value: React.SetStateAction<number>) => {
    const newValue = typeof value === 'function' ? value(state.minWordLength) : value;
    dispatch({ type: 'SET_MIN_WORD_LENGTH', payload: newValue });
  }, [state.minWordLength]);

  const setPlayers = useCallback((value: React.SetStateAction<Player[]>) => {
    const newValue = typeof value === 'function' ? value(state.players) : value;
    dispatch({ type: 'SET_PLAYERS', payload: newValue });
  }, [state.players]);

  const updatePlayer = useCallback((username: string, updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PLAYER', payload: { username, updates } });
  }, []);

  const addPlayer = useCallback((player: Player) => {
    dispatch({ type: 'ADD_PLAYER', payload: player });
  }, []);

  const removePlayer = useCallback((username: string) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: username });
  }, []);

  const setLeaderboard = useCallback((value: React.SetStateAction<LeaderboardEntry[]>) => {
    const newValue = typeof value === 'function' ? value(state.leaderboard) : value;
    dispatch({ type: 'SET_LEADERBOARD', payload: newValue });
  }, [state.leaderboard]);

  const addFoundWord = useCallback((word: WordDetail) => {
    dispatch({ type: 'ADD_FOUND_WORD', payload: word });
  }, []);

  const setFoundWords = useCallback((value: React.SetStateAction<WordDetail[]>) => {
    const newValue = typeof value === 'function' ? value(state.foundWords) : value;
    dispatch({ type: 'SET_FOUND_WORDS', payload: newValue });
  }, [state.foundWords]);

  const addAchievement = useCallback((achievement: AchievementPayload) => {
    dispatch({ type: 'ADD_ACHIEVEMENT', payload: achievement });
  }, []);

  const setAchievements = useCallback((value: React.SetStateAction<AchievementPayload[]>) => {
    const newValue = typeof value === 'function' ? value(state.achievements) : value;
    dispatch({ type: 'SET_ACHIEVEMENTS', payload: newValue });
  }, [state.achievements]);

  const setWaitingForResults = useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(state.waitingForResults) : value;
    dispatch({ type: 'SET_WAITING_FOR_RESULTS', payload: newValue });
  }, [state.waitingForResults]);

  const setShowStartAnimation = useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(state.showStartAnimation) : value;
    dispatch({ type: 'SET_SHOW_START_ANIMATION', payload: newValue });
  }, [state.showStartAnimation]);

  const setShufflingGrid = useCallback((value: React.SetStateAction<LetterGrid | null>) => {
    const newValue = typeof value === 'function' ? value(state.shufflingGrid) : value;
    dispatch({ type: 'SET_SHUFFLING_GRID', payload: newValue });
  }, [state.shufflingGrid]);

  const setHighlightedCells = useCallback((value: React.SetStateAction<Array<{ row: number; col: number }>>) => {
    const newValue = typeof value === 'function' ? value(state.highlightedCells) : value;
    dispatch({ type: 'SET_HIGHLIGHTED_CELLS', payload: newValue });
  }, [state.highlightedCells]);

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

  const setTournamentData = useCallback((value: React.SetStateAction<TournamentData | null>) => {
    const newValue = typeof value === 'function' ? value(state.tournamentData) : value;
    dispatch({ type: 'SET_TOURNAMENT_DATA', payload: newValue });
  }, [state.tournamentData]);

  const setTournamentStandings = useCallback((value: React.SetStateAction<TournamentStanding[]>) => {
    const newValue = typeof value === 'function' ? value(state.tournamentStandings) : value;
    dispatch({ type: 'SET_TOURNAMENT_STANDINGS', payload: newValue });
  }, [state.tournamentStandings]);

  const setShowTournamentStandings = useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(state.showTournamentStandings) : value;
    dispatch({ type: 'SET_SHOW_TOURNAMENT_STANDINGS', payload: newValue });
  }, [state.showTournamentStandings]);

  const setXpGainedData = useCallback((value: React.SetStateAction<XpGainedPayload | null>) => {
    const newValue = typeof value === 'function' ? value(state.xpGainedData) : value;
    dispatch({ type: 'SET_XP_GAINED_DATA', payload: newValue });
  }, [state.xpGainedData]);

  const setLevelUpData = useCallback((value: React.SetStateAction<LevelUpPayload | null>) => {
    const newValue = typeof value === 'function' ? value(state.levelUpData) : value;
    dispatch({ type: 'SET_LEVEL_UP_DATA', payload: newValue });
  }, [state.levelUpData]);

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

// Default export removed - use named export instead
