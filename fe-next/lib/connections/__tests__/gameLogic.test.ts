import { describe, it, expect } from 'vitest';
import {
  normalizeGuess,
  checkGuess,
  initGameState,
  applyGuess,
  advancePuzzle,
  xpForPuzzle,
  INITIAL_LIVES,
  POINTS_EASY,
  POINTS_MEDIUM,
  POINTS_HARD,
  STREAK_BONUS_THRESHOLD,
} from '../gameLogic';
import type { ConnectionPuzzle } from '../types';

const MOCK_PUZZLES: ConnectionPuzzle[] = [
  { id: 'p1', word1: 'BOOK', word2: 'HOLE', bridge: 'WORM', difficulty: 'easy' },
  { id: 'p2', word1: 'SUN', word2: 'LIGHT', bridge: 'MOON', difficulty: 'medium' },
  { id: 'p3', word1: 'FIRE', word2: 'PLACE', bridge: 'WORK', difficulty: 'hard', hint: 'fireworks' },
];

describe('normalizeGuess', () => {
  it('lowercases and trims', () => {
    expect(normalizeGuess('  WORM  ')).toBe('worm');
    expect(normalizeGuess('Worm')).toBe('worm');
  });

  it('handles Hebrew without modification beyond trim', () => {
    expect(normalizeGuess('  ספר  ')).toBe('ספר');
  });
});

describe('checkGuess', () => {
  const puzzle = MOCK_PUZZLES[0];

  it('returns correct=true for exact match (case-insensitive)', () => {
    expect(checkGuess('worm', puzzle).correct).toBe(true);
    expect(checkGuess('WORM', puzzle).correct).toBe(true);
  });

  it('returns correct=false for wrong answer', () => {
    expect(checkGuess('cat', puzzle).correct).toBe(false);
  });

  it('returns normalized versions in result', () => {
    const result = checkGuess('WORM', puzzle);
    expect(result.normalizedGuess).toBe('worm');
    expect(result.normalizedAnswer).toBe('worm');
  });

  it('accepts plural form of bridge (worms -> worm)', () => {
    expect(checkGuess('worms', puzzle).correct).toBe(true);
    expect(checkGuess('WORMS', puzzle).correct).toBe(true);
  });

  it('accepts singular form when bridge stored plural (cats -> cat)', () => {
    const pluralPuzzle: ConnectionPuzzle = { ...puzzle, bridge: 'CATS' };
    expect(checkGuess('cat', pluralPuzzle).correct).toBe(true);
  });

  it('strips trailing punctuation from guess', () => {
    expect(checkGuess('worm.', puzzle).correct).toBe(true);
    expect(checkGuess('worm!', puzzle).correct).toBe(true);
    expect(checkGuess('"worm"', puzzle).correct).toBe(true);
  });

  it('accepts any entry in acceptedAnswers in addition to bridge', () => {
    const multi: ConnectionPuzzle = { ...puzzle, acceptedAnswers: ['CASE', 'SHELF'] };
    expect(checkGuess('case', multi).correct).toBe(true);
    expect(checkGuess('SHELF', multi).correct).toBe(true);
    expect(checkGuess('worm', multi).correct).toBe(true);
    expect(checkGuess('nope', multi).correct).toBe(false);
  });
});

describe('initGameState', () => {
  it('starts with first puzzle, full lives, zero score', () => {
    const state = initGameState(MOCK_PUZZLES);
    expect(state.currentIndex).toBe(0);
    expect(state.lives).toBe(INITIAL_LIVES);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.completedIds.size).toBe(0);
  });
});

describe('applyGuess', () => {
  it('correct guess: adds points, increments streak, sets status correct', () => {
    const state = initGameState(MOCK_PUZZLES);
    const next = applyGuess(state, 'worm');
    expect(next.status).toBe('correct');
    expect(next.score).toBe(POINTS_EASY);
    expect(next.streak).toBe(1);
    expect(next.wrongAttempts).toBe(0);
  });

  it('wrong guess: decrements lives, increments wrongAttempts, resets streak', () => {
    const state = initGameState(MOCK_PUZZLES);
    const next = applyGuess(state, 'cat');
    expect(next.status).toBe('wrong');
    expect(next.lives).toBe(INITIAL_LIVES - 1);
    expect(next.wrongAttempts).toBe(1);
    expect(next.streak).toBe(0);
    expect(next.score).toBe(0);
  });

  it('second wrong guess shows hint', () => {
    const state = initGameState([MOCK_PUZZLES[2]]); // has hint
    const after1 = applyGuess(state, 'bad');
    const after2 = applyGuess(after1, 'bad');
    expect(after2.status).toBe('hint');
  });

  it('streak bonus at threshold', () => {
    let state = initGameState(MOCK_PUZZLES);
    // fill streak to threshold
    for (let i = 0; i < STREAK_BONUS_THRESHOLD - 1; i++) {
      state = { ...state, streak: i };
      state = applyGuess(state, 'worm'); // correct guess on puzzle 0
      // reset to same puzzle to keep testing
      state = { ...state, currentIndex: 0 };
    }
    const baseline = state.score;
    state = { ...state, streak: STREAK_BONUS_THRESHOLD - 1 };
    const withBonus = applyGuess(state, 'worm');
    expect(withBonus.score).toBeGreaterThan(baseline + POINTS_EASY);
  });

  it('medium puzzle gives more points than easy', () => {
    const state = initGameState([MOCK_PUZZLES[1]]);
    const next = applyGuess(state, 'moon');
    expect(next.score).toBe(POINTS_MEDIUM);
  });

  it('hard puzzle gives more points than medium', () => {
    const state = initGameState([MOCK_PUZZLES[2]]);
    const next = applyGuess(state, 'work');
    expect(next.score).toBe(POINTS_HARD);
  });
});

describe('advancePuzzle', () => {
  it('increments index and resets per-puzzle state', () => {
    const state = initGameState(MOCK_PUZZLES);
    const next = advancePuzzle(state);
    expect(next.currentIndex).toBe(1);
    expect(next.wrongAttempts).toBe(0);
    expect(next.status).toBe('playing');
    expect(next.input).toBe('');
  });

  it('sets finished when no more puzzles', () => {
    const state = { ...initGameState(MOCK_PUZZLES), currentIndex: MOCK_PUZZLES.length - 1 };
    const next = advancePuzzle(state);
    expect(next.status).toBe('finished');
  });

  it('adds completed puzzle id', () => {
    const state = initGameState(MOCK_PUZZLES);
    const next = advancePuzzle(state);
    expect(next.completedIds.has('p1')).toBe(true);
  });
});

describe('xpForPuzzle', () => {
  it('awards 10 XP for easy with no streak bonus', () => {
    expect(xpForPuzzle('easy', 1)).toBe(10);
  });

  it('awards 20 XP for medium', () => {
    expect(xpForPuzzle('medium', 1)).toBe(20);
  });

  it('awards 35 XP for hard', () => {
    expect(xpForPuzzle('hard', 1)).toBe(35);
  });

  it('applies streak bonus at threshold', () => {
    expect(xpForPuzzle('easy', STREAK_BONUS_THRESHOLD)).toBe(15);
    expect(xpForPuzzle('hard', STREAK_BONUS_THRESHOLD)).toBe(53);
  });
});
