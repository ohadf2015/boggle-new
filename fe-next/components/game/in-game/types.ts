/**
 * InGameScreen Types
 */

import type { ReactNode, MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language, GameModeSelection } from '@/shared/types/game';
import type {
  FoundWord,
  ExtendedLeaderboardPlayer as LeaderboardPlayer,
  TournamentData,
} from '@/shared/types/view';
import type { BoardTheme } from '@/shared/types/socket';
import type { RoundEventState } from '@/components/game/in-game/components/RoundEventOverlay';
import type { SpecialWordEvent } from '@/components/game/in-game/components/SpecialWordToast';

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
  /**
   * Timestamp of the last accepted word. Threaded through to
   * `ComboDisplayConnected`, which owns the ~10 Hz combo-window RAF so it
   * doesn't cascade through 4 memo boundaries during a drag. Null when no
   * combo has been started.
   */
  lastWordTime?: number | null;

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

  // Game mode (classic/blast/word-hunt) — controls mode-specific overlays
  gameMode?: GameModeSelection;

  // Word-hunt input handler (state is read internally from store).
  onWordHuntGuess?: (guess: string) => void;

  // Player experience - used to determine inactivity threshold for keyboard trails
  totalGamesPlayed?: number;

  // Tutorial callback - opens onboarding tutorial
  onShowTutorial?: () => void;

  // Round events (blizzard/lightning/meteor)
  roundEvent?: RoundEventState | null;

  // Special word found by any player
  specialWordEvent?: SpecialWordEvent | null;

  // Golden letters (bonus tiles highlighted on grid)
  goldenLetters?: Array<{ row: number; col: number }>;

  // Timer urgency state — drives screen border glow
  timerUrgencyState?: 'normal' | 'low' | 'veryLow' | 'critical';
  onTimerState?: (state: 'normal' | 'low' | 'veryLow' | 'critical') => void;

  // Desktop shell integration: when true, desktop shell owns the timer UI (suppress 4× CircularTimer mounts)
  inDesktopShell?: boolean;
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
