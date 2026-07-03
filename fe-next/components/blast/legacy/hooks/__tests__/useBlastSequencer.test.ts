import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastSequencer } from '../useBlastSequencer';
import type { GravityResult } from '../../utils/blastGravity';

/**
 * Regression: the grid commit must NEVER be skipped, even when a second
 * cascade overlaps one already in flight.
 *
 * Bug (persistent letterless tiles): `animateCascade` carried the grid-state
 * commit (`commitFn`) *after* its concurrency guard. When a second word was
 * submitted while a cascade was still animating, the guard returned early and
 * dropped the commit — engine refs advanced but React `currentGrid` froze on
 * the stale (blank-bearing) grid, leaving a tile rendered with no letter.
 */
const emptyGravity: GravityResult = {
  newGrid: [],
  newTileStates: [],
  clearedTiles: [],
  fallingTiles: [],
  newTiles: [],
};

describe('useBlastSequencer — commit is never skipped', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('still commits the grid when a cascade overlaps one already running', () => {
    const { result } = renderHook(() => useBlastSequencer());

    const commitA = vi.fn();
    const commitB = vi.fn();

    // First cascade — enters, sets runningRef=true, suspends on a timer.
    act(() => {
      void result.current.animateCascade(emptyGravity, 0, commitA);
    });
    expect(commitA).toHaveBeenCalledTimes(1);

    // Second cascade overlaps (runningRef still true). The animation is
    // correctly skipped, but the grid commit must NOT be.
    act(() => {
      void result.current.animateCascade(emptyGravity, 0, commitB);
    });
    expect(commitB).toHaveBeenCalledTimes(1);
  });

  it('invokes commitFn on the normal (non-overlapping) path', () => {
    const { result } = renderHook(() => useBlastSequencer());
    const commit = vi.fn();

    act(() => {
      void result.current.animateCascade(emptyGravity, 0, commit);
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
