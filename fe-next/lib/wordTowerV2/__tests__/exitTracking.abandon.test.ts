/**
 * wt2_exit -> terminal growth event (t_19aaab43): an exit from a Word Tower
 * V2 run that never finished used to leave the start orphaned (mobile WT2:
 * 1 of 18 starts with any outcome). trackWt2Exit now also emits
 * growth:game_abandoned {reason: 'exit'} when a run is still active.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    captureBeacon: (...args: unknown[]) => captureMock(...args),
  },
}));

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
}));

import { trackWt2Exit } from '../exitTracking';
import {
  markGameActive,
  markGameInactive,
  __resetAbandonStateForTests,
} from '@/utils/abandonOnPagehide';

describe('trackWt2Exit — unfinished run maps to game_abandoned', () => {
  beforeEach(() => {
    captureMock.mockClear();
    trackGrowthEventMock.mockClear();
    __resetAbandonStateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still emits growth:wt2_exit with the from screen', () => {
    trackWt2Exit('run');
    expect(trackGrowthEventMock).toHaveBeenCalledWith('wt2_exit', { from: 'run' });
  });

  it('emits growth:game_abandoned {reason: exit} when a run is active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('word-tower', { words_found: 3, floors: 1 });
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));

    trackWt2Exit('run');
    await vi.advanceTimersByTimeAsync(50);

    const calls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toMatchObject({ mode: 'word-tower', reason: 'exit' });
  });

  it('does not emit an abandon when no run is active (exit from home/results)', async () => {
    vi.useFakeTimers();
    trackWt2Exit('home');
    await vi.advanceTimersByTimeAsync(50);

    expect(captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned')).toHaveLength(0);
  });

  it('does not emit an abandon when the run already completed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('word-tower');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    markGameInactive(); // completion landed before the exit

    trackWt2Exit('results');
    await vi.advanceTimersByTimeAsync(50);

    expect(captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned')).toHaveLength(0);
  });
});
