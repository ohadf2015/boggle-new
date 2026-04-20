import type { ConnectionPuzzle, GameState, GuessResult } from './types';

export const INITIAL_LIVES = 3;
export const POINTS_EASY = 100;
export const POINTS_MEDIUM = 200;
export const POINTS_HARD = 350;
export const STREAK_BONUS_THRESHOLD = 3;
export const STREAK_BONUS_MULTIPLIER = 1.5;
const HINT_WRONG_THRESHOLD = 2;

const POINTS_BY_DIFFICULTY: Record<ConnectionPuzzle['difficulty'], number> = {
  easy: POINTS_EASY,
  medium: POINTS_MEDIUM,
  hard: POINTS_HARD,
};

export function xpForPuzzle(difficulty: ConnectionPuzzle['difficulty'], streak: number): number {
  const base = POINTS_BY_DIFFICULTY[difficulty];
  const bonus = streak >= STREAK_BONUS_THRESHOLD ? Math.floor(base * (STREAK_BONUS_MULTIPLIER - 1)) : 0;
  return Math.round((base + bonus) / 10);
}

export function normalizeGuess(input: string): string {
  return input.trim().toLowerCase();
}

function stripPunctuation(s: string): string {
  // keep Unicode letters + digits; drop everything else (quotes, punctuation, whitespace edges)
  return s.replace(/[^\p{L}\p{N}]/gu, '');
}

function depluralize(s: string): string {
  if (s.length > 3 && s.endsWith('es')) return s.slice(0, -2);
  if (s.length > 2 && s.endsWith('s')) return s.slice(0, -1);
  return s;
}

function canonicalize(s: string): string {
  return depluralize(stripPunctuation(normalizeGuess(s)));
}

export function checkGuess(input: string, puzzle: ConnectionPuzzle): GuessResult {
  const normalizedGuess = normalizeGuess(input);
  const normalizedAnswer = normalizeGuess(puzzle.bridge);
  const guessKey = canonicalize(input);
  const candidates = [puzzle.bridge, ...(puzzle.acceptedAnswers ?? [])];
  const correct = candidates.some((c) => canonicalize(c) === guessKey) && guessKey.length > 0;
  return { correct, normalizedGuess, normalizedAnswer };
}

export function initGameState(puzzles: ConnectionPuzzle[]): GameState {
  return {
    puzzles,
    currentIndex: 0,
    score: 0,
    streak: 0,
    lives: INITIAL_LIVES,
    wrongAttempts: 0,
    status: 'playing',
    input: '',
    completedIds: new Set(),
    ratedIds: new Set(),
  };
}

export function giveUp(state: GameState): GameState {
  if (state.status === 'finished' || state.status === 'correct' || state.status === 'gaveUp') return state;
  return { ...state, status: 'gaveUp', lives: Math.max(0, state.lives - 1), streak: 0, wrongAttempts: 0 };
}

export function markRated(state: GameState, puzzleId: string): GameState {
  if (state.ratedIds.has(puzzleId)) return state;
  const ratedIds = new Set(state.ratedIds);
  ratedIds.add(puzzleId);
  return { ...state, ratedIds };
}

export function applyGuess(state: GameState, input: string): GameState {
  const puzzle = state.puzzles[state.currentIndex];
  const { correct } = checkGuess(input, puzzle);

  if (correct) {
    const base = POINTS_BY_DIFFICULTY[puzzle.difficulty];
    const newStreak = state.streak + 1;
    const bonus = newStreak >= STREAK_BONUS_THRESHOLD ? Math.floor(base * (STREAK_BONUS_MULTIPLIER - 1)) : 0;
    return { ...state, status: 'correct', score: state.score + base + bonus, streak: newStreak, wrongAttempts: 0 };
  }

  const newWrongAttempts = state.wrongAttempts + 1;
  const showHint = newWrongAttempts >= HINT_WRONG_THRESHOLD && !!puzzle.hint;
  return {
    ...state,
    status: showHint ? 'hint' : 'wrong',
    lives: Math.max(0, state.lives - 1),
    wrongAttempts: newWrongAttempts,
    streak: 0,
  };
}

export function advancePuzzle(state: GameState): GameState {
  const puzzle = state.puzzles[state.currentIndex];
  const completedIds = new Set(state.completedIds);
  completedIds.add(puzzle.id);
  const nextIndex = state.currentIndex + 1;
  const finished = nextIndex >= state.puzzles.length;
  return {
    ...state,
    currentIndex: nextIndex,
    wrongAttempts: 0,
    input: '',
    status: finished ? 'finished' : 'playing',
    completedIds,
  };
}
