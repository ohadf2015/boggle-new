import { describe, it, expect } from 'vitest';
import {
  normalizeGuess,
  checkGuess,
  initGameState,
  applyGuess,
  advancePuzzle,
  giveUp,
  revive,
  revealHint,
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

  // Latin-script locales (es/sv) ride the A–Z keyboard: the player types base
  // letters and diacritics are forgiven on both sides (NFD fold).
  it('folds Spanish diacritics — "anos" matches stored "años", "n" matches "ñ"', () => {
    const es: ConnectionPuzzle = { ...puzzle, bridge: 'años' };
    expect(checkGuess('anos', es).correct).toBe(true);
    expect(checkGuess('años', es).correct).toBe(true);
    const ene: ConnectionPuzzle = { ...puzzle, bridge: 'uñas' };
    expect(checkGuess('unas', ene).correct).toBe(true);
  });

  it('folds Swedish å/ä/ö — "blabar" matches stored "blåbär"', () => {
    const sv: ConnectionPuzzle = { ...puzzle, bridge: 'blåbär' };
    expect(checkGuess('blabar', sv).correct).toBe(true);
    expect(checkGuess('blåbär', sv).correct).toBe(true);
    const ros: ConnectionPuzzle = { ...puzzle, bridge: 'ros' };
    expect(checkGuess('ros', ros).correct).toBe(true);
  });

  it('does not regress plain ASCII or Hebrew matching', () => {
    expect(checkGuess('worm', puzzle).correct).toBe(true);
    const he: ConnectionPuzzle = { ...puzzle, bridge: 'שוקולד' };
    expect(checkGuess('שוקולד', he).correct).toBe(true);
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
    expect(state.hintRevealed).toBe(false);
  });

  it('accepts initialLives option to carry lives across levels', () => {
    const state = initGameState(MOCK_PUZZLES, { initialLives: 1 });
    expect(state.lives).toBe(1);
  });

  it('clamps initialLives to [0..INITIAL_LIVES]', () => {
    expect(initGameState(MOCK_PUZZLES, { initialLives: -3 }).lives).toBe(0);
    expect(initGameState(MOCK_PUZZLES, { initialLives: 99 }).lives).toBe(INITIAL_LIVES);
  });

  it('initialLives=0 sets status outOfLives so dead-on-resume is honored', () => {
    const state = initGameState(MOCK_PUZZLES, { initialLives: 0 });
    expect(state.lives).toBe(0);
    expect(state.status).toBe('outOfLives');
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

  it('does NOT auto-show hint on second wrong guess (manual reveal only)', () => {
    const state = initGameState([MOCK_PUZZLES[2]]); // has hint
    const after1 = applyGuess(state, 'bad');
    const after2 = applyGuess(after1, 'bad');
    expect(after2.status).toBe('wrong');
    expect(after2.hintRevealed).toBe(false);
  });

  it('sets status outOfLives when lives drops to 0 from a wrong guess', () => {
    let state = initGameState(MOCK_PUZZLES);
    state = applyGuess(state, 'cat'); // lives 2
    state = applyGuess(state, 'cat'); // lives 1
    state = applyGuess(state, 'cat'); // lives 0
    expect(state.lives).toBe(0);
    expect(state.status).toBe('outOfLives');
  });

  it('blocks further guesses when status is outOfLives', () => {
    let state = initGameState(MOCK_PUZZLES);
    for (let i = 0; i < INITIAL_LIVES; i++) state = applyGuess(state, 'cat');
    const next = applyGuess(state, 'worm');
    // out-of-lives is terminal until revive
    expect(next).toBe(state);
  });

  it('streak bonus at threshold', () => {
    let state = initGameState(MOCK_PUZZLES);
    for (let i = 0; i < STREAK_BONUS_THRESHOLD - 1; i++) {
      state = { ...state, streak: i };
      state = applyGuess(state, 'worm');
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

describe('giveUp', () => {
  it('reveals answer (status gaveUp) without decrementing lives', () => {
    const state = initGameState(MOCK_PUZZLES);
    const next = giveUp(state);
    expect(next.status).toBe('gaveUp');
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.streak).toBe(0);
  });

  it('works from outOfLives state too (admin skip after death)', () => {
    let state = initGameState(MOCK_PUZZLES);
    for (let i = 0; i < INITIAL_LIVES; i++) state = applyGuess(state, 'cat');
    expect(state.status).toBe('outOfLives');
    const next = giveUp(state);
    expect(next.status).toBe('gaveUp');
  });
});

describe('revive', () => {
  it('refills lives, clears wrongAttempts, status playing', () => {
    let state = initGameState(MOCK_PUZZLES);
    for (let i = 0; i < INITIAL_LIVES; i++) state = applyGuess(state, 'cat');
    expect(state.status).toBe('outOfLives');
    const revived = revive(state);
    expect(revived.lives).toBe(INITIAL_LIVES);
    expect(revived.wrongAttempts).toBe(0);
    expect(revived.status).toBe('playing');
  });

  it('preserves score and current puzzle index', () => {
    let state = initGameState(MOCK_PUZZLES);
    state = { ...state, score: 1234, currentIndex: 0 };
    for (let i = 0; i < INITIAL_LIVES; i++) state = applyGuess(state, 'cat');
    const revived = revive(state);
    expect(revived.score).toBe(1234);
    expect(revived.currentIndex).toBe(0);
  });
});

describe('revealHint', () => {
  it('sets hintRevealed true; does not affect lives or status', () => {
    const state = initGameState([MOCK_PUZZLES[2]]);
    const after = revealHint(state);
    expect(after.hintRevealed).toBe(true);
    expect(after.lives).toBe(INITIAL_LIVES);
    expect(after.status).toBe('playing');
  });

  it('is idempotent', () => {
    const state = initGameState([MOCK_PUZZLES[2]]);
    const once = revealHint(state);
    const twice = revealHint(once);
    expect(twice.hintRevealed).toBe(true);
  });
});

describe('advancePuzzle', () => {
  it('increments index and resets per-puzzle state including hintRevealed', () => {
    let state = initGameState(MOCK_PUZZLES);
    state = revealHint(state);
    const next = advancePuzzle(state);
    expect(next.currentIndex).toBe(1);
    expect(next.wrongAttempts).toBe(0);
    expect(next.status).toBe('playing');
    expect(next.input).toBe('');
    expect(next.hintRevealed).toBe(false);
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
