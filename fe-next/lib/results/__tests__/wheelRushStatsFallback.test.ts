import { describe, it, expect } from 'vitest';
import { deriveWheelRushStatsFromScores, resolveWheelRushStats } from '../wheelRushStatsFallback';

describe('deriveWheelRushStatsFromScores', () => {
  it('returns empty when scores are nullish or empty', () => {
    expect(deriveWheelRushStatsFromScores(null)).toEqual({});
    expect(deriveWheelRushStatsFromScores(undefined)).toEqual({});
    expect(deriveWheelRushStatsFromScores([])).toEqual({});
  });

  it('counts validated, non-duplicate words as wordsLocked and copies totalScore', () => {
    const stats = deriveWheelRushStatsFromScores([
      {
        username: 'alice',
        score: 42,
        allWords: [
          { word: 'CAT', validated: true, isDuplicate: false },
          { word: 'DOG', validated: true, isDuplicate: false },
          { word: 'NOPE', validated: false, isDuplicate: false },
          { word: 'CAT', validated: true, isDuplicate: true },
        ],
      },
    ]);

    expect(stats.alice).toEqual({
      wordsLocked: 2,
      wordsStolen: 0,
      wordsStolenFromMe: 0,
      bestWord: 'CAT',
      totalScore: 42,
    });
  });

  it('picks longest validated word as bestWord', () => {
    const stats = deriveWheelRushStatsFromScores([
      {
        username: 'bob',
        score: 90,
        allWords: [
          { word: 'AT', validated: true, isDuplicate: false },
          { word: 'TANDEM', validated: true, isDuplicate: false },
          { word: 'TWO', validated: true, isDuplicate: false },
        ],
      },
    ]);
    expect(stats.bob.bestWord).toBe('TANDEM');
  });

  it('handles missing allWords gracefully', () => {
    const stats = deriveWheelRushStatsFromScores([
      { username: 'eve', score: 0 },
    ]);
    expect(stats.eve).toEqual({
      wordsLocked: 0,
      wordsStolen: 0,
      wordsStolenFromMe: 0,
      bestWord: '',
      totalScore: 0,
    });
  });
});

describe('resolveWheelRushStats', () => {
  it('prefers server stats when provided and non-empty', () => {
    const server = {
      alice: { wordsLocked: 5, wordsStolen: 2, wordsStolenFromMe: 1, bestWord: 'CRANE', totalScore: 100 },
    };
    const result = resolveWheelRushStats(server, [
      { username: 'alice', score: 999, allWords: [{ word: 'A', validated: true }] },
    ]);
    expect(result).toBe(server);
  });

  it('falls back to scores-derived stats when server stats empty', () => {
    const result = resolveWheelRushStats({}, [
      { username: 'bob', score: 30, allWords: [{ word: 'BOB', validated: true, isDuplicate: false }] },
    ]);
    expect(result.bob.wordsLocked).toBe(1);
    expect(result.bob.totalScore).toBe(30);
  });

  it('falls back to scores when server stats undefined', () => {
    const result = resolveWheelRushStats(undefined, [
      { username: 'cara', score: 10 },
    ]);
    expect(result.cara).toBeDefined();
  });
});
