import { beforeEach, describe, expect, it } from 'vitest';
import { getSoloGamesPlayed } from '@/lib/soloGamesPlayed';
import { getHighScores } from '../../highScoreManager';
import { commitSoloRound, readSoloResultsSnapshot } from '../soloResultsSnapshot';

describe('solo results snapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('reads the pre-write count and keeps the record flags after the round is committed', () => {
    const first = readSoloResultsSnapshot('s1', 40, 'planet');
    expect(first.gamesPlayed).toBe(0);
    expect(first.dailyDoneEver).toBe(false);
    expect(first.records).toEqual({ scoreIsRecord: true, wordIsRecord: true });

    commitSoloRound('s1', {
      score: 40, wordCount: 1, longestWord: 'planet', difficulty: 'MEDIUM', durationSeconds: 120,
    });
    expect(getSoloGamesPlayed()).toBe(1);
    expect(getHighScores().allTimeBest?.score).toBe(40);

    commitSoloRound('s1', {
      score: 40, wordCount: 1, longestWord: 'planet', difficulty: 'MEDIUM', durationSeconds: 120,
    });
    expect(getSoloGamesPlayed()).toBe(1);

    const remount = readSoloResultsSnapshot('s1', 40, 'planet');
    expect(remount.records.scoreIsRecord).toBe(true);
    expect(remount.gamesPlayed).toBe(0);
  });

  it('a later session sees the stored best and does not badge a tie', () => {
    readSoloResultsSnapshot('s1', 40, 'planet');
    commitSoloRound('s1', {
      score: 40, wordCount: 1, longestWord: 'planet', difficulty: 'MEDIUM', durationSeconds: 120,
    });
    const next = readSoloResultsSnapshot('s2', 40, 'planet');
    expect(next.gamesPlayed).toBe(1);
    expect(next.records).toEqual({ scoreIsRecord: false, wordIsRecord: false });
    const better = readSoloResultsSnapshot('s3', 50, 'planets');
    expect(better.records).toEqual({ scoreIsRecord: true, wordIsRecord: true });
  });

  it('does not advance the solo counter when the round is not solo-bots', () => {
    readSoloResultsSnapshot('challenge-1', 10, 'cat');
    commitSoloRound('challenge-1', {
      score: 10, wordCount: 1, longestWord: 'cat', difficulty: 'EASY', durationSeconds: 90,
      trackSoloRound: false,
    });
    expect(getSoloGamesPlayed()).toBe(0);
    expect(getHighScores().allTimeBest?.score).toBe(10);
  });
});
