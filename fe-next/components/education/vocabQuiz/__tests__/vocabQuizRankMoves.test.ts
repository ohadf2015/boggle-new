import { describe, it, expect } from 'vitest';
import { closeRace, rankMoves } from '../vocabQuizRankMoves';
import type { VocabQuizStanding } from '@/shared/types/vocabQuiz';

const row = (username: string, score: number): VocabQuizStanding => ({ username, score, streak: 0, bestStreak: 0, correctCount: 0 });

describe('rankMoves', () => {
  it('reports how many places each player climbed since the last reveal', () => {
    const prev = [row('Maya', 300), row('Leo', 200), row('Noa', 100)];
    const next = [row('Noa', 400), row('Maya', 350), row('Leo', 200)];
    expect(rankMoves(prev, next)).toEqual({ Noa: 2, Maya: -1, Leo: -1 });
  });

  it('reports no movement on the first reveal or for a newcomer', () => {
    expect(rankMoves(null, [row('Maya', 1)])).toEqual({ Maya: 0 });
    expect(rankMoves([row('Maya', 5)], [row('Ari', 9), row('Maya', 5)])).toEqual({ Ari: 0, Maya: -1 });
  });

  it('matches names case- and space-insensitively, like the server', () => {
    expect(rankMoves([row('Leo', 2), row('maya ', 1)], [row('Maya', 3), row('Leo', 2)])).toEqual({ Maya: 1, Leo: -1 });
  });
});

describe('closeRace', () => {
  it('flags a near tie at the top', () => {
    expect(closeRace([row('Maya', 820), row('Leo', 790)])).toBe(true);
  });

  it('stays quiet for a runaway lead, a lone player or an empty board', () => {
    expect(closeRace([row('Maya', 820), row('Leo', 300)])).toBe(false);
    expect(closeRace([row('Maya', 820)])).toBe(false);
    expect(closeRace([row('Maya', 0), row('Leo', 0)])).toBe(false);
  });
});
