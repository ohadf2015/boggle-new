/**
 * useHostViewState - Centralized state management for HostView
 *
 * This hook consolidates all HostView state into a single manageable hook,
 * reducing the number of props passed to child components and socket event handlers.
 *
 * Architecture Pattern: Composition over individual useState calls
 * Provides both game settings state and game runtime state.
 */

import { useState, useCallback, useMemo, useRef, MutableRefObject } from 'react';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_MIN_WORD_LENGTH } from '@/utils/consts';
import type { Language, LetterGrid, DifficultyLevel, Avatar } from '@/types';

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
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

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
    avatar?: Avatar;
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
  playerAchievements: Record<string, string[]>;
}

// Host-specific playing state
export interface HostPlayingState {
  hostFoundWords: string[];
  hostAchievements: string[];
}

// Tournament state
export interface TournamentState {
  tournamentData: TournamentData | null;
  tournamentCreating: boolean;
  finalScores: FinalScoresData | null;
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
  setDifficulty: (d: DifficultyLevel) => void;
  setMinWordLength: (l: number) => void;
  setTimerValue: (v: number) => void;
  setTimerDirection: (d: number) => void;
  setHostPlaying: (p: boolean) => void;
  setGameType: (t: 'regular' | 'tournament') => void;
  setTournamentRounds: (r: number) => void;

  // Runtime
  runtime: GameRuntimeState;
  setGameStarted: (s: boolean) => void;
  setTableData: (t: LetterGrid) => void;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setWaitingForResults: (w: boolean) => void;
  setShowStartAnimation: (s: boolean) => void;

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
  setTournamentCreating: (c: boolean) => void;
  setFinalScores: React.Dispatch<React.SetStateAction<FinalScoresData | null>>;

  // Animation
  animation: AnimationState;
  setShufflingGrid: (g: LetterGrid | null) => void;
  setHighlightedCells: (c: Array<{ row: number; col: number }>) => void;

  // UI
  ui: HostUIState;
  setShowQR: (s: boolean) => void;
  setShowExitConfirm: (s: boolean) => void;
  setShowCancelTournamentDialog: (s: boolean) => void;

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

  // Actions
  resetForNewGame: () => void;
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
  const [timerValue, setTimerValue] = useState<number>(1);
  const [timerDirection, setTimerDirection] = useState<number>(0);
  const [hostPlayingEnabled, setHostPlayingEnabled] = useState<boolean>(true);
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
  const [finalScores, setFinalScores] = useState<FinalScoresData | null>(null);

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
  }), [showQR, showExitConfirm, showCancelTournamentDialog]);

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

    // Actions
    resetForNewGame,
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
    resolvedRoomLanguage,
    wordsForBoard,
    addHostFoundWord,
    resetForNewGame,
    generateNewTable,
  ]);
}

export default useHostViewState;
