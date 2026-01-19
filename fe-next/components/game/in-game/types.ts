/**
 * InGameScreen Types
 */

import type { ReactNode, MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/shared/types/game';
import type {
  FoundWord,
  ExtendedLeaderboardPlayer as LeaderboardPlayer,
  TournamentData,
} from '@/shared/types/view';
import type { BoardTheme } from '@/shared/types/socket';

/**
 * State for hints feature in single-player mode
 */
export interface HintsState {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  isSinglePlayer: boolean;
  requestHint: () => void;
  clearHint: () => void;
}

/**
 * Props for the InGameScreen component
 */
export interface InGameScreenProps {
  // Core identity
  username: string;
  gameCode: string;
  isHost?: boolean;
  isPlaying?: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
  dir?: 'rtl' | 'ltr';
  socket: Socket | null;

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue?: number;
  gameActive?: boolean;
  showStartAnimation?: boolean;
  gameLanguage?: Language | null;
  minWordLength?: number;
  comboLevel?: number;
  comboLevelRef?: MutableRefObject<number>;
  /** Time remaining for combo as percentage (0-100), null when no active combo */
  comboTimeRemaining?: number | null;
  /** Whether combo timer is in danger zone (<30% remaining) */
  comboDanger?: boolean;

  // Player data
  foundWords?: FoundWord[] | string[];
  leaderboard?: LeaderboardPlayer[];
  totalBoardWords?: number | null;

  // Callbacks
  onExitRoom?: () => void;
  onWordSubmit?: (word: string) => void;
  onResetCombo?: () => void;

  // Tournament (optional)
  tournamentData?: TournamentData | null;

  // Hints (single-player mode)
  hints?: HintsState;

  // Earthquake/Fire Round
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Focus mode - hides leaderboard and chat during gameplay
  gameplayFocusMode?: boolean;

  // Achievement dock (rendered outside this component)
  children?: ReactNode;

  // Board theme (date-themed words indicator)
  boardTheme?: BoardTheme | null;

  // Player experience - used to determine inactivity threshold for keyboard trails
  totalGamesPlayed?: number;

  // Tutorial callback - opens onboarding tutorial
  onShowTutorial?: () => void;
}

/**
 * Translation function type
 */
export type TranslationFn = (path: string, params?: Record<string, string | number>) => string;

/**
 * State for earthquake effect
 */
export type EarthquakeState = 'idle' | 'warning' | 'shaking' | 'fire-round';

/**
 * Mobile tab options for bottom navigation
 */
export type MobileTab = 'words' | 'leaderboard';

/**
 * Position of a tapped cell on the grid
 */
export interface TappedCellPosition {
  row: number;
  col: number;
  letter: string;
}
