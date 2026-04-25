export type Difficulty = 'easy' | 'medium' | 'hard';

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
}

export type PuzzleLocale = 'en' | 'he';

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
}

export type PuzzleRating = 'like' | 'dislike';

export interface GuessResult {
  correct: boolean;
  normalizedGuess: string;
  normalizedAnswer: string;
}
