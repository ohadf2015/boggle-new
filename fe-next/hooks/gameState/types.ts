/**
 * Type definitions for useGameState hook
 */

import type {
  LetterGrid,
  Avatar,
  Language,
  LeaderboardEntry,
  WordDetail,
} from '@/shared/types/game';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload, BoardTheme } from '@/shared/types/socket';

// ==========================================
// Domain Types
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

// ==========================================
// State Types
// ==========================================

export interface GameStateValues {
  // Core game state
  gameActive: boolean;
  letterGrid: LetterGrid | null;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;
  totalBoardWords: number | null; // Total possible words on the board

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
}

// ==========================================
// Action Types
// ==========================================

export type GameStateAction =
  // Core game actions
  | { type: 'SET_GAME_ACTIVE'; payload: boolean | ((prev: boolean) => boolean) }
  | { type: 'SET_LETTER_GRID'; payload: LetterGrid | null | ((prev: LetterGrid | null) => LetterGrid | null) }
  | { type: 'SET_REMAINING_TIME'; payload: number | null | ((prev: number | null) => number | null) }
  | { type: 'UPDATE_REMAINING_TIME'; payload: (prev: number | null) => number | null }
  | { type: 'SET_GAME_LANGUAGE'; payload: Language | null | ((prev: Language | null) => Language | null) }
  | { type: 'SET_MIN_WORD_LENGTH'; payload: number | ((prev: number) => number) }
  | { type: 'SET_TOTAL_BOARD_WORDS'; payload: number | null | ((prev: number | null) => number | null) }
  // Player actions
  | { type: 'SET_PLAYERS'; payload: Player[] | ((prev: Player[]) => Player[]) }
  | { type: 'UPDATE_PLAYER'; payload: { username: string; updates: Partial<Player> } }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'SET_LEADERBOARD'; payload: LeaderboardEntry[] | ((prev: LeaderboardEntry[]) => LeaderboardEntry[]) }
  // Word actions
  | { type: 'ADD_FOUND_WORD'; payload: WordDetail }
  | { type: 'SET_FOUND_WORDS'; payload: WordDetail[] | ((prev: WordDetail[]) => WordDetail[]) }
  | { type: 'ADD_ACHIEVEMENT'; payload: AchievementPayload }
  | { type: 'SET_ACHIEVEMENTS'; payload: AchievementPayload[] | ((prev: AchievementPayload[]) => AchievementPayload[]) }
  // UI actions
  | { type: 'SET_WAITING_FOR_RESULTS'; payload: boolean | ((prev: boolean) => boolean) }
  | { type: 'SET_SHOW_START_ANIMATION'; payload: boolean | ((prev: boolean) => boolean) }
  | { type: 'SET_SHUFFLING_GRID'; payload: LetterGrid | null | ((prev: LetterGrid | null) => LetterGrid | null) }
  | { type: 'SET_HIGHLIGHTED_CELLS'; payload: Array<{ row: number; col: number }> | ((prev: Array<{ row: number; col: number }>) => Array<{ row: number; col: number }>) }
  // Combo actions
  | { type: 'INCREMENT_COMBO' }
  | { type: 'RESET_COMBO' }
  | { type: 'USE_COMBO_SHIELD' }
  | { type: 'UPDATE_LAST_WORD_TIME' }
  // Tournament actions
  | { type: 'SET_TOURNAMENT_DATA'; payload: TournamentData | null | ((prev: TournamentData | null) => TournamentData | null) }
  | { type: 'SET_TOURNAMENT_STANDINGS'; payload: TournamentStanding[] | ((prev: TournamentStanding[]) => TournamentStanding[]) }
  | { type: 'SET_SHOW_TOURNAMENT_STANDINGS'; payload: boolean | ((prev: boolean) => boolean) }
  // XP/Level actions
  | { type: 'SET_XP_GAINED_DATA'; payload: XpGainedPayload | null | ((prev: XpGainedPayload | null) => XpGainedPayload | null) }
  | { type: 'SET_LEVEL_UP_DATA'; payload: LevelUpPayload | null | ((prev: LevelUpPayload | null) => LevelUpPayload | null) }
  // Board theme actions
  | { type: 'SET_BOARD_THEME'; payload: BoardTheme | null | ((prev: BoardTheme | null) => BoardTheme | null) }
  // Reset actions
  | { type: 'RESET_FOR_NEW_ROUND' }
  | { type: 'RESET_ALL' };

// ==========================================
// Action Interface Types
// ==========================================

export interface GameStateActions {
  // Core game actions
  setGameActive: React.Dispatch<React.SetStateAction<boolean>>;
  setLetterGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setGameLanguage: React.Dispatch<React.SetStateAction<Language | null>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  setTotalBoardWords: React.Dispatch<React.SetStateAction<number | null>>;

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
  updateLastWordTime: () => void;

  // Tournament actions
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentStandings: React.Dispatch<React.SetStateAction<TournamentStanding[]>>;
  setShowTournamentStandings: React.Dispatch<React.SetStateAction<boolean>>;

  // XP/Level actions
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Board theme actions
  setBoardTheme: React.Dispatch<React.SetStateAction<BoardTheme | null>>;

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
