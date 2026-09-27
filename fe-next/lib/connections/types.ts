import type { PuzzleTheme } from './theme';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** A real attested compound pair shown after the solve ("why it works"). */
export interface PuzzleExample {
  w1: string;
  bridge: string;
  w2: string;
}

export type PuzzleSource = 'authored' | 'online' | 'generated' | 'council-seed' | 'ugc';

export interface ConnectionPuzzle {
  id: string;
  word1: string;
  word2: string;
  bridge: string;
  /** Additional accepted answers beyond the canonical bridge */
  acceptedAnswers?: string[];
  /** Human-readable hint shown after the player spends an ad/coin to reveal */
  hint?: string;
  difficulty: Difficulty;
  /** Real compound examples that demonstrate both bridges (teach-moment / share). */
  examples?: PuzzleExample[];
  /** Provenance — where this puzzle came from. */
  source?: PuzzleSource;
  /**
   * Optional explicit coarse theme. When absent, theme is inferred from the
   * words (see lib/connections/theme.ts). Used only to disperse same-feel
   * puzzles in the level order and daily set — never shown to the player.
   */
  theme?: PuzzleTheme;
}

export type PuzzleLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

export type GameStatus =
  | 'playing'
  | 'correct'
  | 'wrong'
  | 'gaveUp'
  | 'outOfLives'
  | 'finished';

export interface GameState {
  puzzles: ConnectionPuzzle[];
  currentIndex: number;
  score: number;
  streak: number;
  lives: number;
  wrongAttempts: number;
  status: GameStatus;
  input: string;
  completedIds: Set<string>;
  ratedIds: Set<string>;
  /** True once the player has paid (ad/admin) to see the hint for the current puzzle. Resets per puzzle. */
  hintRevealed: boolean;
  /**
   * When set, wrong guesses are budgeted PER PUZZLE instead of draining the
   * shared `lives` pool: spending the last attempt reveals that bridge
   * (`gaveUp`) and play continues to the next puzzle. Undefined = endless-mode
   * behaviour (shared lives, run ends at `outOfLives`).
   */
  attemptsPerPuzzle?: number;
}

export type PuzzleRating = 'like' | 'dislike';

export interface GuessResult {
  correct: boolean;
  normalizedGuess: string;
  normalizedAnswer: string;
}
