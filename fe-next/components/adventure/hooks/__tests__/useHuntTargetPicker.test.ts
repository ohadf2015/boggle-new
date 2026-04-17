/**
 * useHuntTargetPicker Tests
 *
 * Picks a hunt-mode target word once solvedWords resolves, with a 10s
 * safety fallback that marks the picker "done" rather than synthesizing
 * garbage from raw grid letters.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHuntTargetPicker } from '../useHuntTargetPicker';

vi.mock('@/lib/adventure/huntMode', () => ({
  pickHuntTarget: (words: Set<string> | null | undefined) => {
    if (!words || words.size === 0) return null;
    return words.values().next().value ?? null;
  },
}));

type SolvedProp = Set<string> | null;

describe('useHuntTargetPicker', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does nothing when archetype is not hunt', () => {
    const setHuntTarget = vi.fn();
    renderHook(() => useHuntTargetPicker({ archetype: 'classic', solvedWords: new Set(['cat']), setHuntTarget }));
    expect(setHuntTarget).not.toHaveBeenCalled();
  });

  it('picks a target when solvedWords resolves in hunt mode', () => {
    const setHuntTarget = vi.fn();
    const { rerender } = renderHook(
      (p: { solved: SolvedProp }) => useHuntTargetPicker({ archetype: 'hunt', solvedWords: p.solved, setHuntTarget }),
      { initialProps: { solved: null as SolvedProp } }
    );
    expect(setHuntTarget).not.toHaveBeenCalled();
    rerender({ solved: new Set(['tiger', 'lion']) });
    expect(setHuntTarget).toHaveBeenCalledWith('tiger');
  });

  it('picks only once even if solvedWords changes again', () => {
    const setHuntTarget = vi.fn();
    const { rerender } = renderHook(
      (p: { solved: SolvedProp }) => useHuntTargetPicker({ archetype: 'hunt', solvedWords: p.solved, setHuntTarget }),
      { initialProps: { solved: new Set(['a']) as SolvedProp } }
    );
    rerender({ solved: new Set(['b']) });
    expect(setHuntTarget).toHaveBeenCalledTimes(1);
  });

  it('does not set target when pickHuntTarget returns null', () => {
    const setHuntTarget = vi.fn();
    renderHook(() => useHuntTargetPicker({ archetype: 'hunt', solvedWords: new Set<string>(), setHuntTarget }));
    expect(setHuntTarget).not.toHaveBeenCalled();
  });

  it('safety timeout fires after 10s without calling setHuntTarget', () => {
    const setHuntTarget = vi.fn();
    renderHook(() => useHuntTargetPicker({ archetype: 'hunt', solvedWords: null, setHuntTarget }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(setHuntTarget).not.toHaveBeenCalled();
  });

  it('safety timeout does not re-fire setHuntTarget if target already picked', () => {
    const setHuntTarget = vi.fn();
    const { rerender } = renderHook(
      (p: { solved: SolvedProp }) => useHuntTargetPicker({ archetype: 'hunt', solvedWords: p.solved, setHuntTarget }),
      { initialProps: { solved: null as SolvedProp } }
    );
    rerender({ solved: new Set(['word']) });
    expect(setHuntTarget).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(setHuntTarget).toHaveBeenCalledTimes(1);
  });
});
