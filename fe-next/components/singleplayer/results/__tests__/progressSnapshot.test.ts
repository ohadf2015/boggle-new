import { describe, it, expect } from 'vitest';
import { buildProgressSnapshot } from '../progressSnapshot';

describe('buildProgressSnapshot — "feel progress every game"', () => {
  it('Given the very first game, When built, Then it is game #1 with no delta and a "first" goal', () => {
    const s = buildProgressSnapshot({
      score: 42, isNewHighScore: true, previousHighScore: null,
      priorScores: [], totalGames: 1, wordsFound: 6, wordsPossible: 40,
    });
    expect(s.gameNumber).toBe(1);
    expect(s.lastScore).toBeNull();
    expect(s.delta).toBeNull();
    expect(s.best).toBe(42);
    expect(s.isNewBest).toBe(true);
    expect(s.recentScores).toEqual([42]);
    expect(s.nextGoal).toEqual({ kind: 'first' });
  });

  it('Given prior games, When the score beats the last one but not the best, Then delta is positive and the goal is the gap to best', () => {
    const s = buildProgressSnapshot({
      score: 80, isNewHighScore: false, previousHighScore: 120,
      priorScores: [60, 95, 120, 30], totalGames: 5, wordsFound: 10, wordsPossible: 50,
    });
    expect(s.gameNumber).toBe(5);
    expect(s.lastScore).toBe(60);
    expect(s.delta).toBe(20);
    expect(s.best).toBe(120);
    expect(s.isNewBest).toBe(false);
    expect(s.nextGoal).toEqual({ kind: 'beatBest', gap: 40 });
  });

  it('Given a new personal best, When built, Then best is the current score and the goal is to beat it', () => {
    const s = buildProgressSnapshot({
      score: 150, isNewHighScore: true, previousHighScore: 120,
      priorScores: [120, 90], totalGames: 3, wordsFound: 15, wordsPossible: 50,
    });
    expect(s.isNewBest).toBe(true);
    expect(s.best).toBe(150);
    expect(s.delta).toBe(30);
    expect(s.nextGoal).toEqual({ kind: 'newBest', target: 150 });
  });

  it('Given many prior games, When built, Then recentScores is the last 5 plus current, oldest → newest', () => {
    const s = buildProgressSnapshot({
      score: 7, isNewHighScore: false, previousHighScore: 9,
      priorScores: [6, 5, 4, 3, 2, 1, 0], totalGames: 8, wordsFound: 1, wordsPossible: null,
    });
    expect(s.recentScores).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('Given the board word count, When built, Then coverage is a rounded percent; without it, null', () => {
    const withBoard = buildProgressSnapshot({
      score: 10, isNewHighScore: false, previousHighScore: 10,
      priorScores: [], totalGames: 1, wordsFound: 12, wordsPossible: 84,
    });
    expect(withBoard.coverage).toBe(14);
    const noBoard = buildProgressSnapshot({
      score: 10, isNewHighScore: false, previousHighScore: 10,
      priorScores: [], totalGames: 1, wordsFound: 12, wordsPossible: null,
    });
    expect(noBoard.coverage).toBeNull();
  });

  it('Given a stale totalGames counter smaller than history, When built, Then gameNumber never goes below history + 1', () => {
    const s = buildProgressSnapshot({
      score: 5, isNewHighScore: false, previousHighScore: 5,
      priorScores: [1, 2, 3], totalGames: 0, wordsFound: 1, wordsPossible: null,
    });
    expect(s.gameNumber).toBe(4);
  });

  it('Given a score that ties the best, When built, Then the goal is beatBest with gap 1 (not zero)', () => {
    const s = buildProgressSnapshot({
      score: 100, isNewHighScore: false, previousHighScore: 100,
      priorScores: [100], totalGames: 2, wordsFound: 8, wordsPossible: null,
    });
    expect(s.nextGoal).toEqual({ kind: 'beatBest', gap: 1 });
  });
});
