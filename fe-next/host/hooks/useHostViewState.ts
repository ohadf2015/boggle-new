/**
 * useHostViewState - Centralized state management for HostView
 *
 * This hook consolidates all HostView state into a single manageable hook,
 * reducing the number of props passed to child components and socket event handlers.
 *
 * Architecture Pattern: Composition over individual useState calls
 * Provides both game settings state and game runtime state.
 */

import { useState, useCallback, useMemo, useRef, useEffect, MutableRefObject } from 'react';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_MIN_WORD_LENGTH } from '@/utils/consts';
import type { Language, LetterGrid, DifficultyLevel } from '@/types';
import type { Player } from '@/hooks/useGameState';
import type { BoardTheme } from '@/shared/types/socket';
import type { FinalScoresState } from './socket/useHostGameEvents';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

// ==========================================
// Type Definitions
// ==========================================

export interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
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

// Game settings (pre-game configuration)
export interface GameSettings {
  difficulty: DifficultyLevel;
  minWordLength: number;
  timerValue: number;
  timerDirection: number;
  hostPlaying: boolean;
  gameType: 'regular' | 'tournament';
  tournamentRounds: number;
}

// Game runtime state (during game)
export interface GameRuntimeState {
  gameStarted: boolean;
  tableData: LetterGrid;
  remainingTime: number | null;
  waitingForResults: boolean;
  showStartAnimation: boolean;
}

// Player tracking state
export interface PlayerTrackingState {
  playersReady: Player[];
  playerWordCounts: Record<string, number>;
  playerScores: Record<string, number>;
  playerAchievements: Record<string, unknown[]>;
}

// Host-specific playing state
export interface HostPlayingState {
  hostFoundWords: string[];
  hostAchievements: unknown[];
}

// Tournament state
export interface TournamentState {
  tournamentData: TournamentData | null;
  tournamentCreating: boolean;
  finalScores: FinalScoresState | null;
}

// Animation state
export interface AnimationState {
  shufflingGrid: LetterGrid | null;
  highlightedCells: Array<{ row: number; col: number }>;
}

// UI state
export interface HostUIState {
  showQR: boolean;
  showExitConfirm: boolean;
  showCancelTournamentDialog: boolean;
  showSoloConfirm: boolean;
}

// Combo state (matching PlayerView pattern)
export interface ComboState {
  level: number;
  lastWordTime: number | null;
}

// XP/Level state
export interface XpState {
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;
}

// ==========================================
// Hook Options and Return Types
// ==========================================

export interface UseHostViewStateOptions {
  initialPlayers?: Player[];
  roomLanguage?: Language;
  defaultLanguage?: Language;
}

export interface UseHostViewStateReturn {
  // Settings
  settings: GameSettings;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;

  // Runtime
  runtime: GameRuntimeState;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<React.SetStateAction<LetterGrid>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;

  // Player tracking
  players: PlayerTrackingState;
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;

  // Host playing
  hostPlaying: HostPlayingState;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<string[]>>;
  addHostFoundWord: (word: string) => void;

  // Tournament
  tournament: TournamentState;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setFinalScores: React.Dispatch<React.SetStateAction<FinalScoresState | null>>;

  // Animation
  animation: AnimationState;
  setShufflingGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setHighlightedCells: React.Dispatch<React.SetStateAction<Array<{ row: number; col: number }>>>;

  // UI
  ui: HostUIState;
  setShowQR: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExitConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCancelTournamentDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSoloConfirm: React.Dispatch<React.SetStateAction<boolean>>;

  // Combo
  combo: ComboState;
  comboRefs: {
    levelRef: MutableRefObject<number>;
    lastWordTimeRef: MutableRefObject<number | null>;
    timeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  };
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;

  // XP
  xp: XpState;
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedData | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpData | null>>;

  // Refs
  refs: {
    intentionalExitRef: MutableRefObject<boolean>;
    hasTriggeredUrgentMusicRef: MutableRefObject<boolean>;
    tournamentTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  };

  // Computed
  roomLanguage: Language;
  wordsForBoard: string[];
  setWordsForBoard: React.Dispatch<React.SetStateAction<string[]>>;
  boardTheme: BoardTheme | null;
  setBoardTheme: React.Dispatch<React.SetStateAction<BoardTheme | null>>;

  // Actions
  resetForNewGame: () => void;
  resetUrgentMusicRef: () => void;
  generateNewTable: () => LetterGrid;
}

// ==========================================
// Hook Implementation
// ==========================================

export function useHostViewState(options: UseHostViewStateOptions = {}): UseHostViewStateReturn {
  const {
    initialPlayers = [],
    roomLanguage: roomLanguageProp,
    defaultLanguage = 'en'
  } = options;

  const resolvedRoomLanguage = (roomLanguageProp || defaultLanguage) as Language;

  // ==========================================
  // Game Settings State
  // ==========================================
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const [minWordLength, setMinWordLength] = useState<number>(DEFAULT_MIN_WORD_LENGTH);
  const [timerValue, setTimerValue] = useState<number>(1.5); // 1:30 default (minutes)
  const [timerDirection, setTimerDirection] = useState<number>(0);
  const [hostPlayingEnabled, setHostPlayingEnabled] = useLocalStorageState<boolean>('host_broadcast_mode_enabled', true);

  // On mobile devices, TV mode (broadcast) should always be off — force hostPlaying=true
  // This prevents a desktop TV-mode toggle from carrying over to mobile via localStorage
  const isMobileRef = useRef(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  useEffect(() => {
    if (isMobileRef.current && !hostPlayingEnabled) {
      setHostPlayingEnabled(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [gameType, setGameType] = useState<'regular' | 'tournament'>('regular');
  const [tournamentRounds, setTournamentRounds] = useState<number>(3);

  // ==========================================
  // Game Runtime State
  // ==========================================
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [tableData, setTableData] = useState<LetterGrid>(generateRandomTable());
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [waitingForResults, setWaitingForResults] = useState<boolean>(false);
  const [showStartAnimation, setShowStartAnimation] = useState<boolean>(false);

  // ==========================================
  // Player Tracking State
  // ==========================================
  const [playersReady, setPlayersReady] = useState<Player[]>(initialPlayers);
  const [playerWordCounts, setPlayerWordCounts] = useState<Record<string, number>>({});
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [playerAchievements, setPlayerAchievements] = useState<Record<string, string[]>>({});

  // ==========================================
  // Host Playing State
  // ==========================================
  const [hostFoundWords, setHostFoundWords] = useState<string[]>([]);
  const [hostAchievements, setHostAchievements] = useState<string[]>([]);

  // ==========================================
  // Tournament State
  // ==========================================
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [tournamentCreating, setTournamentCreating] = useState<boolean>(false);
  const [finalScores, setFinalScores] = useState<FinalScoresState | null>(null);

  // ==========================================
  // Animation State
  // ==========================================
  const [shufflingGrid, setShufflingGrid] = useState<LetterGrid | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Array<{ row: number; col: number }>>([]);

  // ==========================================
  // UI State
  // ==========================================
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showCancelTournamentDialog, setShowCancelTournamentDialog] = useState<boolean>(false);
  const [showSoloConfirm, setShowSoloConfirm] = useState<boolean>(false);

  // ==========================================
  // Combo State
  // ==========================================
  const [comboLevel, setComboLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const comboLevelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // XP State
  // ==========================================
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // ==========================================
  // Words for Board Embedding
  // ==========================================
  const [wordsForBoard, setWordsForBoard] = useState<string[]>([]);
  const [boardTheme, setBoardTheme] = useState<BoardTheme | null>(null);

  // ==========================================
  // Refs
  // ==========================================
  const intentionalExitRef = useRef<boolean>(false);
  const hasTriggeredUrgentMusicRef = useRef<boolean>(false);
  const tournamentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep combo refs in sync
  comboLevelRef.current = comboLevel;
  lastWordTimeRef.current = lastWordTime;

  // ==========================================
  // Memoized State Objects
  // ==========================================

  const settings = useMemo<GameSettings>(() => ({
    difficulty,
    minWordLength,
    timerValue,
    timerDirection,
    hostPlaying: hostPlayingEnabled,
    gameType,
    tournamentRounds,
  }), [difficulty, minWordLength, timerValue, timerDirection, hostPlayingEnabled, gameType, tournamentRounds]);

  const runtime = useMemo<GameRuntimeState>(() => ({
    gameStarted,
    tableData,
    remainingTime,
    waitingForResults,
    showStartAnimation,
  }), [gameStarted, tableData, remainingTime, waitingForResults, showStartAnimation]);

  const players = useMemo<PlayerTrackingState>(() => ({
    playersReady,
    playerWordCounts,
    playerScores,
    playerAchievements,
  }), [playersReady, playerWordCounts, playerScores, playerAchievements]);

  const hostPlayingState = useMemo<HostPlayingState>(() => ({
    hostFoundWords,
    hostAchievements,
  }), [hostFoundWords, hostAchievements]);

  const tournament = useMemo<TournamentState>(() => ({
    tournamentData,
    tournamentCreating,
    finalScores,
  }), [tournamentData, tournamentCreating, finalScores]);

  const animation = useMemo<AnimationState>(() => ({
    shufflingGrid,
    highlightedCells,
  }), [shufflingGrid, highlightedCells]);

  const ui = useMemo<HostUIState>(() => ({
    showQR,
    showExitConfirm,
    showCancelTournamentDialog,
    showSoloConfirm,
  }), [showQR, showExitConfirm, showCancelTournamentDialog, showSoloConfirm]);

  const combo = useMemo<ComboState>(() => ({
    level: comboLevel,
    lastWordTime,
  }), [comboLevel, lastWordTime]);

  const comboRefs = useMemo(() => ({
    levelRef: comboLevelRef,
    lastWordTimeRef: lastWordTimeRef,
    timeoutRef: comboTimeoutRef,
  }), []);

  const xp = useMemo<XpState>(() => ({
    xpGainedData,
    levelUpData,
  }), [xpGainedData, levelUpData]);

  const refs = useMemo(() => ({
    intentionalExitRef,
    hasTriggeredUrgentMusicRef,
    tournamentTimeoutRef,
  }), []);

  // ==========================================
  // Actions
  // ==========================================

  const addHostFoundWord = useCallback((word: string) => {
    setHostFoundWords(prev => [...prev, word]);
  }, []);

  const generateNewTable = useCallback((): LetterGrid => {
    const difficultyConfig = DIFFICULTIES[difficulty];
    const embedWords = resolvedRoomLanguage !== 'ja' ? wordsForBoard : [];
    return generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      resolvedRoomLanguage,
      embedWords
    );
  }, [difficulty, resolvedRoomLanguage, wordsForBoard]);

  const resetForNewGame = useCallback(() => {
    setGameStarted(false);
    setRemainingTime(null);
    setWaitingForResults(false);
    setShowStartAnimation(false);
    setShufflingGrid(null);
    setPlayerWordCounts({});
    setPlayerScores({});
    setPlayerAchievements({});
    setHostFoundWords([]);
    setHostAchievements([]);
    setFinalScores(null);
    setTournamentData(null);
    setTournamentCreating(false);
    setComboLevel(0);
    setLastWordTime(null);
    setXpGainedData(null);
    setLevelUpData(null);
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

  const resetUrgentMusicRef = useCallback(() => {
    hasTriggeredUrgentMusicRef.current = false;
  }, []);

  // ==========================================
  // Return
  // ==========================================

  return useMemo(() => ({
    // Settings
    settings,
    setDifficulty,
    setMinWordLength,
    setTimerValue,
    setTimerDirection,
    setHostPlaying: setHostPlayingEnabled,
    setGameType,
    setTournamentRounds,

    // Runtime
    runtime,
    setGameStarted,
    setTableData,
    setRemainingTime,
    setWaitingForResults,
    setShowStartAnimation,

    // Players
    players,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,

    // Host playing
    hostPlaying: hostPlayingState,
    setHostFoundWords,
    setHostAchievements,
    addHostFoundWord,

    // Tournament
    tournament,
    setTournamentData,
    setTournamentCreating,
    setFinalScores,

    // Animation
    animation,
    setShufflingGrid,
    setHighlightedCells,

    // UI
    ui,
    setShowQR,
    setShowExitConfirm,
    setShowCancelTournamentDialog,
    setShowSoloConfirm,

    // Combo
    combo,
    comboRefs,
    setComboLevel,
    setLastWordTime,

    // XP
    xp,
    setXpGainedData,
    setLevelUpData,

    // Refs
    refs,

    // Computed
    roomLanguage: resolvedRoomLanguage,
    wordsForBoard,
    setWordsForBoard,
    boardTheme,
    setBoardTheme,

    // Actions
    resetForNewGame,
    resetUrgentMusicRef,
    generateNewTable,
     
  }), [
    settings,
    runtime,
    players,
    hostPlayingState,
    tournament,
    animation,
    ui,
    combo,
    comboRefs,
    xp,
    refs,
    setHostPlayingEnabled,
    resolvedRoomLanguage,
    wordsForBoard,
    boardTheme,
    addHostFoundWord,
    resetForNewGame,
    resetUrgentMusicRef,
    generateNewTable,
  ]);
}

export default useHostViewState;
