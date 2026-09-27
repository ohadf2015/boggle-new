/**
 * The hook that remembers this session's rounds.
 *
 * Everything here guards one failure: printing a wrong number at the exact
 * moment the room is looking. A results screen re-renders several times while
 * the score payload settles (Pitfall Class 3 — `join` and `requestGameState`
 * deliver the standings in different shapes), so the round must be recorded
 * ONCE and the delta must be read from the session as it was BEFORE this round
 * — never from the list this round has already been written into.
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSessionRoundHistory } from '../useSessionRoundHistory';

const KEY = 'lexiclash.edu.round-history.test';

const args = (over: Record<string, unknown> = {}) => ({
  sessionKey: KEY,
  score: 140,
  rank: 1,
  players: 4,
  sweep: false,
  ready: true,
  ...over,
});

describe('useSessionRoundHistory', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says nothing about a first round', () => {
    const { result } = renderHook(() => useSessionRoundHistory(args()));
    expect(result.current.momentum).toBeNull();
    expect(result.current.roundNumber).toBe(1);
  });

  it('reads the delta against the round stored before this one', () => {
    renderHook(() => useSessionRoundHistory(args({ score: 100 })));
    const { result } = renderHook(() => useSessionRoundHistory(args({ score: 140 })));
    expect(result.current.momentum?.delta).toBe(40);
    expect(result.current.roundNumber).toBe(2);
  });

  it('records the round exactly once however often the results screen re-renders', () => {
    const { result, rerender } = renderHook(() => useSessionRoundHistory(args({ score: 100 })));
    rerender();
    rerender();
    const stored = JSON.parse(window.sessionStorage.getItem(KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(result.current.momentum).toBeNull();
  });

  it('keeps the delta steady when the score payload settles late', () => {
    renderHook(() => useSessionRoundHistory(args({ score: 100 })));
    const { result, rerender } = renderHook(() => useSessionRoundHistory(args({ score: 140 })));
    rerender();
    expect(result.current.momentum?.delta).toBe(40);
    const stored = JSON.parse(window.sessionStorage.getItem(KEY) || '[]');
    expect(stored).toHaveLength(2);
  });

  it('records nothing until the round is ready to be counted', () => {
    const { rerender } = renderHook(
      ({ ready }) => useSessionRoundHistory(args({ ready })),
      { initialProps: { ready: false } }
    );
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    rerender({ ready: true });
    expect(JSON.parse(window.sessionStorage.getItem(KEY) || '[]')).toHaveLength(1);
  });

  it('counts the class sweep streak including the round just played', () => {
    renderHook(() => useSessionRoundHistory(args({ sweep: true })));
    const { result } = renderHook(() => useSessionRoundHistory(args({ sweep: true })));
    expect(result.current.sweepStreak).toBe(2);
  });

  it('degrades to silence when sessionStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const { result } = renderHook(() => useSessionRoundHistory(args()));
    expect(result.current.momentum).toBeNull();
    expect(result.current.roundNumber).toBe(1);
  });

  it('ignores a corrupted session entry instead of crashing the results screen', () => {
    window.sessionStorage.setItem(KEY, 'not json');
    const { result } = renderHook(() => useSessionRoundHistory(args()));
    expect(result.current.momentum).toBeNull();
  });
});
