import { normalizeHebrewWord } from '../../shared/utils/wordNormalization';
import type { ConnectionPuzzle, GameState, GuessResult, GameStatus } from './types';

export const INITIAL_LIVES = 3;
export const POINTS_EASY = 100;
export const POINTS_MEDIUM = 200;
export const POINTS_HARD = 350;
export const STREAK_BONUS_THRESHOLD = 3;
export const STREAK_BONUS_MULTIPLIER = 1.5;

const POINTS_BY_DIFFICULTY: Record<ConnectionPuzzle['difficulty'], number> = {
  easy: POINTS_EASY,
  medium: POINTS_MEDIUM,
  hard: POINTS_HARD,
};

/**
 * A give-up is a real abandon (player quit mid-puzzle). Running out of lives
 * or solving correctly are both natural game endings — count as completed so
 * the completion funnel isn't undercounted; `isWinner` carries win/loss.
 */
export function isCompletedTerminalStatus(status: GameStatus): boolean {
  return status === 'correct' || status === 'outOfLives';
}

export function xpForPuzzle(difficulty: ConnectionPuzzle['difficulty'], streak: number): number {
  const base = POINTS_BY_DIFFICULTY[difficulty];
  const bonus = streak >= STREAK_BONUS_THRESHOLD ? Math.floor(base * (STREAK_BONUS_MULTIPLIER - 1)) : 0;
  return Math.round((base + bonus) / 10);
}

export function normalizeGuess(input: string): string {
  return input.trim().toLowerCase();
}

function stripPunctuation(s: string): string {
  return s.replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Fold diacritics so Latin-script locales (es/sv) play on the base A–Z
 * keyboard: the player types plain letters and accents are forgiven on both
 * sides. NFD decomposes å/ä/ö/ñ/á… into base-letter + combining mark; we then
 * drop the marks. No-op on ASCII and Hebrew (base Hebrew carries no marks).
 */
function foldDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function depluralize(s: string): string {
  if (s.length > 3 && s.endsWith('es')) return s.slice(0, -2);
  if (s.length > 2 && s.endsWith('s')) return s.slice(0, -1);
  return s;
}

function canonicalize(s: string): string {
  // normalizeHebrewWord folds sofit/final letters → base forms so the
  // base-only on-screen keyboard can match sofit-stored bridges (no-op on
  // non-Hebrew text).
  return depluralize(foldDiacritics(normalizeHebrewWord(stripPunctuation(normalizeGuess(s)))));
}

export function checkGuess(input: string, puzzle: ConnectionPuzzle): GuessResult {
  const normalizedGuess = normalizeGuess(input);
  const normalizedAnswer = normalizeGuess(puzzle.bridge);
  const guessKey = canonicalize(input);
  const candidates = [puzzle.bridge, ...(puzzle.acceptedAnswers ?? [])];
  const correct = candidates.some((c) => canonicalize(c) === guessKey) && guessKey.length > 0;
  return { correct, normalizedGuess, normalizedAnswer };
}

export interface InitGameStateOptions {
  /** Lives to start with — clamped to [0..INITIAL_LIVES]. Defaults to INITIAL_LIVES. */
  initialLives?: number;
  /** See GameState.attemptsPerPuzzle. Ignored when < 1. */
  attemptsPerPuzzle?: number;
}

/**
 * Guesses the player still has on the CURRENT puzzle. In per-puzzle mode this
 * is the puzzle's own budget; otherwise it's the shared life pool. Either way
 * it's the single number the HUD should show.
 */
export function attemptsLeft(state: GameState): number {
  if (!state.attemptsPerPuzzle) return state.lives;
  return Math.max(0, state.attemptsPerPuzzle - state.wrongAttempts);
}

export function initGameState(puzzles: ConnectionPuzzle[], opts?: InitGameStateOptions): GameState {
  const requested = opts?.initialLives ?? INITIAL_LIVES;
  const lives = Number.isFinite(requested)
    ? Math.max(0, Math.min(INITIAL_LIVES, Math.floor(requested)))
    : INITIAL_LIVES;
  const perPuzzle = opts?.attemptsPerPuzzle;
  return {
    attemptsPerPuzzle: Number.isFinite(perPuzzle) && (perPuzzle as number) >= 1
      ? Math.floor(perPuzzle as number)
      : undefined,
    puzzles,
    currentIndex: 0,
    score: 0,
    streak: 0,
    lives,
    wrongAttempts: 0,
    status: lives === 0 ? 'outOfLives' : 'playing',
    input: '',
    completedIds: new Set(),
    ratedIds: new Set(),
    hintRevealed: false,
  };
}

export function giveUp(state: GameState): GameState {
  if (state.status === 'finished' || state.status === 'correct' || state.status === 'gaveUp') return state;
  // Reveal answer + skip puzzle. No life penalty — lives are spent on wrong guesses,
  // and ad-revive (or admin) is what restores them.
  return { ...state, status: 'gaveUp', streak: 0, wrongAttempts: 0 };
}

export function revive(state: GameState): GameState {
  return { ...state, lives: INITIAL_LIVES, wrongAttempts: 0, status: 'playing' };
}

export function revealHint(state: GameState): GameState {
  if (state.hintRevealed) return state;
  return { ...state, hintRevealed: true };
}

export function markRated(state: GameState, puzzleId: string): GameState {
  if (state.ratedIds.has(puzzleId)) return state;
  const ratedIds = new Set(state.ratedIds);
  ratedIds.add(puzzleId);
  return { ...state, ratedIds };
}

export function applyGuess(state: GameState, input: string): GameState {
  if (state.status === 'outOfLives' || state.status === 'finished' || state.status === 'gaveUp') {
    return state;
  }
  const puzzle = state.puzzles[state.currentIndex];
  const { correct } = checkGuess(input, puzzle);

  if (correct) {
    const base = POINTS_BY_DIFFICULTY[puzzle.difficulty];
    const newStreak = state.streak + 1;
    const bonus = newStreak >= STREAK_BONUS_THRESHOLD ? Math.floor(base * (STREAK_BONUS_MULTIPLIER - 1)) : 0;
    return { ...state, status: 'correct', score: state.score + base + bonus, streak: newStreak, wrongAttempts: 0 };
  }

  const newWrongAttempts = state.wrongAttempts + 1;

  // Per-puzzle budget: the run's shared lives are untouched, and burning the
  // last attempt reveals this bridge rather than ending the whole run.
  if (state.attemptsPerPuzzle) {
    return {
      ...state,
      status: newWrongAttempts >= state.attemptsPerPuzzle ? 'gaveUp' : 'wrong',
      wrongAttempts: newWrongAttempts,
      streak: 0,
    };
  }

  const newLives = Math.max(0, state.lives - 1);
  return {
    ...state,
    status: newLives === 0 ? 'outOfLives' : 'wrong',
    lives: newLives,
    wrongAttempts: newWrongAttempts,
    streak: 0,
  };
}

export function advancePuzzle(state: GameState): GameState {
  const puzzle = state.puzzles[state.currentIndex];
  const completedIds = new Set(state.completedIds);
  if (puzzle) completedIds.add(puzzle.id);
  const nextIndex = state.currentIndex + 1;
  const finished = nextIndex >= state.puzzles.length;
  return {
    ...state,
    currentIndex: nextIndex,
    wrongAttempts: 0,
    input: '',
    status: finished ? 'finished' : 'playing',
    completedIds,
    hintRevealed: false,
  };
}
