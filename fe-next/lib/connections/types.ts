export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ConnectionPuzzle {
  id: string;
  word1: string;
  word2: string;
  bridge: string;
  /** Additional accepted answers beyond the canonical bridge */
  acceptedAnswers?: string[];
  /** Human-readable hint shown after 2 wrong attempts */
  hint?: string;
  difficulty: Difficulty;
}

export type PuzzleLocale = 'en' | 'he';

export interface GameState {
  puzzles: ConnectionPuzzle[];
  currentIndex: number;
  score: number;
  streak: number;
  lives: number;
  wrongAttempts: number;
  status: 'playing' | 'correct' | 'wrong' | 'hint' | 'gaveUp' | 'finished';
  input: string;
  completedIds: Set<string>;
  ratedIds: Set<string>;
}

export type PuzzleRating = 'like' | 'dislike';

export interface GuessResult {
  correct: boolean;
  normalizedGuess: string;
  normalizedAnswer: string;
}
