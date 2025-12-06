/**
 * useGameState - Centralized game state management hook
 *
 * This hook centralizes common game state used across PlayerView and HostView,
 * reducing prop drilling and ensuring consistent state management.
 *
 * Architecture Pattern: Custom Hook with Reducer-like state management
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  LetterGrid,
  Avatar,
  GameState,
  Language,
  LeaderboardEntry,
  WordDetail,
  TournamentStanding as SharedTournamentStanding,
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
// Default Values
// ==========================================

const DEFAULT_COMBO_STATE: ComboState = {
  level: 0,
  lastWordTime: null,
  shieldsUsed: 0,
};

const COMBO_TIMEOUT_MS = 8000; // 8 seconds to maintain combo
const COMBO_SHIELD_INTERVAL = 10; // Earn shield every 10 valid words

// ==========================================
// Hook Implementation
// ==========================================

export function useGameState(): UseGameStateReturn {
  // Core game state
  const [gameActive, setGameActive] = useState(false);
  const [letterGrid, setLetterGrid] = useState<LetterGrid | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [gameLanguage, setGameLanguage] = useState<Language | null>(null);
  const [minWordLength, setMinWordLength] = useState(2);

  // Player state
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Word state
  const [foundWords, setFoundWords] = useState<WordDetail[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  // UI state
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [shufflingGrid, setShufflingGrid] = useState<LetterGrid | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Array<{ row: number; col: number }>>([]);

  // Combo state
  const [combo, setCombo] = useState<ComboState>(DEFAULT_COMBO_STATE);

  // Tournament state
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [tournamentStandings, setTournamentStandings] = useState<TournamentStanding[]>([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);

  // XP/Level state
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // Refs for use in callbacks
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  comboLevelRef.current = combo.level;
  lastWordTimeRef.current = combo.lastWordTime;

  // ==========================================
  // Player Actions
  // ==========================================

  const updatePlayer = useCallback((username: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p =>
      p.username === username ? { ...p, ...updates } : p
    ));
  }, []);

  const addPlayer = useCallback((player: Player) => {
    setPlayers(prev => {
      // Don't add if already exists
      if (prev.some(p => p.username === player.username)) {
        return prev.map(p => p.username === player.username ? { ...p, ...player } : p);
      }
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((username: string) => {
    setPlayers(prev => prev.filter(p => p.username !== username));
  }, []);

  // ==========================================
  // Word Actions
  // ==========================================

  const addFoundWord = useCallback((word: WordDetail) => {
    setFoundWords(prev => {
      // Don't add duplicates
      if (prev.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
        return prev;
      }
      return [...prev, word];
    });
  }, []);

  const addAchievement = useCallback((achievement: string) => {
    setAchievements(prev => {
      if (prev.includes(achievement)) return prev;
      return [...prev, achievement];
    });
  }, []);

  // ==========================================
  // Combo Actions
  // ==========================================

  const incrementCombo = useCallback(() => {
    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    setCombo(prev => ({
      ...prev,
      level: prev.level + 1,
      lastWordTime: Date.now(),
    }));

    // Set new timeout to reset combo
    comboTimeoutRef.current = setTimeout(() => {
      setCombo(prev => ({ ...prev, level: 0 }));
    }, COMBO_TIMEOUT_MS);
  }, []);

  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    setCombo(prev => ({ ...prev, level: 0 }));
  }, []);

  const useComboShield = useCallback((): boolean => {
    // Check if player has earned a shield (1 per 10 valid words)
    const validWordCount = foundWords.filter(w => w.validated !== false).length;
    const availableShields = Math.floor(validWordCount / COMBO_SHIELD_INTERVAL);

    if (combo.shieldsUsed < availableShields) {
      setCombo(prev => ({ ...prev, shieldsUsed: prev.shieldsUsed + 1 }));
      return true; // Shield used successfully
    }
    return false; // No shield available
  }, [foundWords, combo.shieldsUsed]);

  const updateLastWordTime = useCallback(() => {
    setCombo(prev => ({ ...prev, lastWordTime: Date.now() }));
  }, []);

  // ==========================================
  // Reset Actions
  // ==========================================

  const resetForNewRound = useCallback(() => {
    setGameActive(false);
    setLetterGrid(null);
    setRemainingTime(null);
    setFoundWords([]);
    setAchievements([]);
    setWaitingForResults(false);
    setShowStartAnimation(false);
    setShufflingGrid(null);
    setHighlightedCells([]);
    setCombo(DEFAULT_COMBO_STATE);
    setLeaderboard([]);
    setXpGainedData(null);
    setLevelUpData(null);

    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    resetForNewRound();
    setPlayers([]);
    setGameLanguage(null);
    setMinWordLength(2);
    setTournamentData(null);
    setTournamentStandings([]);
    setShowTournamentStandings(false);
  }, [resetForNewRound]);

  // ==========================================
  // Return Value
  // ==========================================

  return useMemo(() => ({
    // State values
    gameActive,
    letterGrid,
    remainingTime,
    gameLanguage,
    minWordLength,
    players,
    leaderboard,
    foundWords,
    achievements,
    waitingForResults,
    showStartAnimation,
    shufflingGrid,
    highlightedCells,
    combo,
    tournamentData,
    tournamentStandings,
    showTournamentStandings,
    xpGainedData,
    levelUpData,

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
    gameActive,
    letterGrid,
    remainingTime,
    gameLanguage,
    minWordLength,
    players,
    leaderboard,
    foundWords,
    achievements,
    waitingForResults,
    showStartAnimation,
    shufflingGrid,
    highlightedCells,
    combo,
    tournamentData,
    tournamentStandings,
    showTournamentStandings,
    xpGainedData,
    levelUpData,
    updatePlayer,
    addPlayer,
    removePlayer,
    addFoundWord,
    addAchievement,
    incrementCombo,
    resetCombo,
    useComboShield,
    updateLastWordTime,
    resetForNewRound,
    resetAll,
  ]);
}

export default useGameState;
