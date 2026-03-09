/**
 * Store-specific type definitions for the Zustand game state store.
 * These types define the shape of the store's state and actions.
 */

import type { LetterGrid, LeaderboardEntry, Language, WordDetail, GameModeSelection, BlastTileOverlay, LetterFeedback } from '@/shared/types/game';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload, BoardTheme } from '@/shared/types/socket';
import type { Player, TournamentData, TournamentStanding, ComboState } from './types';

// ==========================================
// Store State Interface
// ==========================================

export interface GameState {
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

  // Game mode
  gameMode: GameModeSelection;

  // Blast multiplayer state
  blastTileOverlay: BlastTileOverlay[];
  blastMovesUsed: number;
  blastTotalTileBonus: number;
  blastTotalTilesCleared: number;
  blastSeed: number | null;
  blastComboSync: { comboType: string; username: string; id: string } | null;
  blastOpponentActivity: Array<{ id: string; username: string; type: 'word' | 'combo' | 'milestone'; word?: string; score?: number; comboLevel?: number; message?: string }>;

  // Word Hunt multiplayer state
  wordHuntTargetLength: number;
  wordHuntMyLife: number;
  wordHuntPlayerLives: Record<string, number>;
  wordHuntTargetAttempts: Array<{ guess: string; feedback: LetterFeedback[]; isDiscovery?: boolean }>;
  wordHuntTargetFound: boolean;
  wordHuntEliminatedPlayers: string[];
  wordHuntDiscoveryClues: Array<{ position: number; letter: string }>;
  wordHuntKnownLetters: string[];
}

// ==========================================
// Store Actions Interface
// ==========================================

export interface GameActions {
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
  setBlastTotalTileBonus: (value: number | ((prev: number) => number)) => void;
  setBlastTotalTilesCleared: (value: number | ((prev: number) => number)) => void;
  setBlastSeed: (value: number | null | ((prev: number | null) => number | null)) => void;
  setBlastComboSync: (value: { comboType: string; username: string; id: string } | null) => void;
  pushBlastOpponentActivity: (event: { id: string; username: string; type: 'word' | 'combo' | 'milestone'; word?: string; score?: number; comboLevel?: number; message?: string }) => void;

  // Word Hunt multiplayer actions
  setWordHuntTargetLength: (value: number | ((prev: number) => number)) => void;
  setWordHuntMyLife: (value: number | ((prev: number) => number)) => void;
  setWordHuntPlayerLives: (value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setWordHuntTargetAttempts: (value: Array<{ guess: string; feedback: LetterFeedback[] }> | ((prev: Array<{ guess: string; feedback: LetterFeedback[] }>) => Array<{ guess: string; feedback: LetterFeedback[] }>)) => void;
  setWordHuntTargetFound: (value: boolean | ((prev: boolean) => boolean)) => void;
  setWordHuntEliminatedPlayers: (value: string[] | ((prev: string[]) => string[])) => void;
  addWordHuntDiscoveryClues: (greens: Array<{ position: number; letter: string }>, known: string[]) => void;

  // Batch actions
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
