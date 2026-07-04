/**
 * Tests for useDailyRivalCompare — reads the captured daily rival from
 * sessionStorage for the results head-to-head card.
 */
import { renderHook } from '@testing-library/react';
import { useDailyRivalCompare } from '../useDailyRivalCompare';

const KEY = 'daily_challenge_rival';

function seed(rival: { name: string; emoji: string; score: number; puzzleNumber: number }) {
  sessionStorage.setItem(KEY, JSON.stringify(rival));
}

describe('useDailyRivalCompare', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns null when nothing is stored', () => {
    const { result } = renderHook(() => useDailyRivalCompare(42));
    expect(result.current).toBeNull();
  });

  it('returns the rival when the stored puzzle matches', () => {
    seed({ name: 'Ada', emoji: '🌟', score: 87, puzzleNumber: 42 });
    const { result } = renderHook(() => useDailyRivalCompare(42));
    expect(result.current).toEqual({ name: 'Ada', emoji: '🌟', score: 87, puzzleNumber: 42 });
  });

  it('returns null for a stale rival from a different puzzle', () => {
    seed({ name: 'Ada', emoji: '🌟', score: 87, puzzleNumber: 41 });
    const { result } = renderHook(() => useDailyRivalCompare(42));
    expect(result.current).toBeNull();
  });

  it('clears sessionStorage after a successful read so it does not re-show', () => {
    seed({ name: 'Ada', emoji: '🌟', score: 87, puzzleNumber: 42 });
    renderHook(() => useDailyRivalCompare(42));
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('does not throw on malformed JSON', () => {
    sessionStorage.setItem(KEY, 'not-json{');
    const { result } = renderHook(() => useDailyRivalCompare(42));
    expect(result.current).toBeNull();
  });
});
