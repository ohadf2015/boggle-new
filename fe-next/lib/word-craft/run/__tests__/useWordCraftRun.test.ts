import { renderHook, act } from '@testing-library/react';
import { useWordCraftRun } from '../useWordCraftRun';

const DICT = new Set(['cat', 'cats', 'at']);

describe('useWordCraftRun', () => {
  it('exposes run state and starts in intro phase', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    expect(result.current.state.phase).toBe('intro');
    expect(result.current.state.rack.length).toBe(8);
  });

  it('startRun transitions to playing', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    expect(result.current.state.phase).toBe('playing');
  });

  it('submitMove with no pending placements sets an error and does not crash', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    act(() => result.current.submitMove());
    expect(result.current.state.lastError).toBeTruthy();
    expect(result.current.state.round.score).toBe(0);
  });

  it('endRound routes to roundResult', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    act(() => result.current.endRound());
    expect(result.current.state.phase).toBe('roundResult');
  });

  it('tilesRemaining reflects the bag size', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    expect(result.current.tilesRemaining).toBeGreaterThan(0);
  });
});
