/**
 * useBlastMicroAchievements — hook tests.
 *
 * The hook watches a snapshot of run state, diffs it against already-shown
 * micro-achievements, and surfaces the next unlock as `currentId`. After
 * `displayMs` it auto-clears so the toast can dismiss.
 *
 * TDD: written before implementation.
 */
import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBlastMicroAchievements } from '../useBlastMicroAchievements';
import type { BlastMicroState } from '../../utils/blastMicroAchievements';

function makeSnap(overrides: Partial<BlastMicroState> = {}): BlastMicroState {
  return {
    maxCombo: 0,
    wordsSubmitted: 0,
    longestWordLen: 0,
    biggestSingleClear: 0,
    gemsCollected: 0,
    specialTilesCleared: 0,
    wavesCompleted: 0,
    ...overrides,
  };
}

describe('useBlastMicroAchievements', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts with no current toast', () => {
    const { result } = renderHook(() => useBlastMicroAchievements(makeSnap()));
    expect(result.current.currentId).toBeNull();
  });

  it('surfaces a newly earned achievement on next render', () => {
    const { result, rerender } = renderHook(
      ({ snap }: { snap: BlastMicroState }) => useBlastMicroAchievements(snap),
      { initialProps: { snap: makeSnap() } },
    );
    expect(result.current.currentId).toBeNull();

    rerender({ snap: makeSnap({ maxCombo: 2 }) });
    expect(result.current.currentId).toBe('firstCombo');
  });

  it('auto-clears currentId after displayMs', () => {
    const { result, rerender } = renderHook(
      ({ snap }: { snap: BlastMicroState }) =>
        useBlastMicroAchievements(snap, { displayMs: 1000 }),
      { initialProps: { snap: makeSnap() } },
    );
    rerender({ snap: makeSnap({ maxCombo: 2 }) });
    expect(result.current.currentId).toBe('firstCombo');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentId).toBeNull();
  });

  it('queues multiple unlocks earned in the same tick', () => {
    const { result, rerender } = renderHook(
      ({ snap }: { snap: BlastMicroState }) =>
        useBlastMicroAchievements(snap, { displayMs: 500 }),
      { initialProps: { snap: makeSnap() } },
    );
    // Earn three at once (firstCombo, tripleChain, bigWord)
    rerender({ snap: makeSnap({ maxCombo: 3, longestWordLen: 6 }) });
    const first = result.current.currentId;
    expect(first).not.toBeNull();

    act(() => { vi.advanceTimersByTime(500); });
    const second = result.current.currentId;
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);

    act(() => { vi.advanceTimersByTime(500); });
    const third = result.current.currentId;
    expect(third).not.toBeNull();
    expect([first, second]).not.toContain(third);

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.currentId).toBeNull();
  });

  it('does not re-surface an already-shown achievement', () => {
    const { result, rerender } = renderHook(
      ({ snap }: { snap: BlastMicroState }) =>
        useBlastMicroAchievements(snap, { displayMs: 500 }),
      { initialProps: { snap: makeSnap({ maxCombo: 2 }) } },
    );
    expect(result.current.currentId).toBe('firstCombo');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.currentId).toBeNull();

    // State still satisfies firstCombo — must not re-fire
    rerender({ snap: makeSnap({ maxCombo: 2 }) });
    expect(result.current.currentId).toBeNull();
  });

  it('never surfaces a toast when enabled=false', () => {
    const { result, rerender } = renderHook(
      ({ snap }: { snap: BlastMicroState }) =>
        useBlastMicroAchievements(snap, { enabled: false, displayMs: 500 }),
      { initialProps: { snap: makeSnap() } },
    );
    expect(result.current.currentId).toBeNull();

    rerender({ snap: makeSnap({ maxCombo: 3, longestWordLen: 6 }) });
    expect(result.current.currentId).toBeNull();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.currentId).toBeNull();
  });
});
