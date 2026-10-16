import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { roundHasScore } from '../roundCelebration';
import { useResultsData } from '@/hooks/useResultsData';

const zeroRound = [
  { username: 'Avery', score: 0, allWords: [] },
  { username: 'Jordan', score: 0, allWords: [] },
];

describe('roundHasScore', () => {
  it('GIVEN nobody scored WHEN the round ends THEN there is nothing to celebrate', () => {
    expect(roundHasScore(zeroRound)).toBe(false);
    expect(roundHasScore([])).toBe(false);
    expect(roundHasScore(undefined)).toBe(false);
  });

  it('GIVEN one player scored WHEN the round ends THEN it celebrates', () => {
    expect(roundHasScore([{ score: 0 }, { score: 12 }])).toBe(true);
    expect(roundHasScore([{ totalScore: 0 }, { totalScore: 7 }])).toBe(true);
    expect(roundHasScore([{ totalScore: 0 }])).toBe(false);
  });
});

describe('useResultsData winner on a nobody-scored round', () => {
  it('GIVEN everyone has 0 points WHEN results render THEN the top seat is not a winner', () => {
    const { result } = renderHook(() => useResultsData({ finalScores: zeroRound as never, username: 'Avery' }));
    expect(result.current.isCurrentUserWinner).toBe(false);
  });

  it('GIVEN a real top score WHEN results render THEN the leader is the winner', () => {
    const scores = [{ username: 'Avery', score: 30, allWords: [] }, { username: 'Jordan', score: 10, allWords: [] }];
    const { result } = renderHook(() => useResultsData({ finalScores: scores as never, username: 'Avery' }));
    expect(result.current.isCurrentUserWinner).toBe(true);
  });
});
