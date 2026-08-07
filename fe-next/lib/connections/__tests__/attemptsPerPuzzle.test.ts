/**
 * Per-puzzle attempts (daily challenge forgiveness).
 *
 * The daily used to spend ONE shared pool of 3 lives across all 5 puzzles, so
 * three wrong guesses anywhere ended the whole run at `outOfLives` — the player
 * hit a "0 solved" results screen without ever seeing the remaining puzzles.
 * With `attemptsPerPuzzle` set, a wrong guess costs an attempt on THAT puzzle
 * only; exhausting them reveals the answer (`gaveUp`) and play continues.
 */
import { describe, it, expect } from 'vitest';
import { initGameState, applyGuess, advancePuzzle, attemptsLeft, INITIAL_LIVES } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';

const puzzle = (id: string, bridge: string): ConnectionPuzzle => ({
  id,
  word1: 'A',
  word2: 'B',
  bridge,
  difficulty: 'easy',
});

const SET = [puzzle('p1', 'ONE'), puzzle('p2', 'TWO')];

describe('attemptsPerPuzzle', () => {
  it('given no attemptsPerPuzzle, wrong guesses still burn shared lives (endless mode unchanged)', () => {
    let s = initGameState(SET);
    expect(s.lives).toBe(INITIAL_LIVES);
    for (let i = 0; i < INITIAL_LIVES; i++) s = applyGuess(s, 'nope');
    expect(s.lives).toBe(0);
    expect(s.status).toBe('outOfLives');
  });

  it('given attemptsPerPuzzle, a wrong guess does not consume run lives', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 4 });
    s = applyGuess(s, 'nope');
    expect(s.status).toBe('wrong');
    expect(s.lives).toBe(INITIAL_LIVES);
    expect(s.wrongAttempts).toBe(1);
  });

  it('given the last attempt is spent, the puzzle resolves to gaveUp — never outOfLives', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 4 });
    for (let i = 0; i < 4; i++) s = applyGuess(s, 'nope');
    expect(s.status).toBe('gaveUp');
    expect(s.lives).toBe(INITIAL_LIVES);
    expect(s.streak).toBe(0);
  });

  it('given a burnt-out puzzle, the run continues into the next puzzle', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 2 });
    s = applyGuess(s, 'nope');
    s = applyGuess(s, 'nope');
    expect(s.status).toBe('gaveUp');
    s = advancePuzzle(s);
    expect(s.status).toBe('playing');
    expect(s.currentIndex).toBe(1);
    expect(s.wrongAttempts).toBe(0);
  });

  it('given every puzzle is burnt out, the run ends finished (so the results screen still renders)', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 1 });
    s = advancePuzzle(applyGuess(s, 'nope'));
    s = advancePuzzle(applyGuess(s, 'nope'));
    expect(s.status).toBe('finished');
  });

  it('given a correct guess, attempts reset for the next puzzle', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 3 });
    s = applyGuess(s, 'nope');
    s = applyGuess(s, 'ONE');
    expect(s.status).toBe('correct');
    expect(s.wrongAttempts).toBe(0);
    s = advancePuzzle(s);
    expect(attemptsLeft(s)).toBe(3);
  });

  it('attemptsLeft counts down on the current puzzle and floors at 0', () => {
    let s = initGameState(SET, { attemptsPerPuzzle: 2 });
    expect(attemptsLeft(s)).toBe(2);
    s = applyGuess(s, 'nope');
    expect(attemptsLeft(s)).toBe(1);
    s = applyGuess(s, 'nope');
    expect(attemptsLeft(s)).toBe(0);
  });

  it('attemptsLeft falls back to shared lives when attemptsPerPuzzle is unset', () => {
    const s = initGameState(SET);
    expect(attemptsLeft(s)).toBe(INITIAL_LIVES);
  });
});
