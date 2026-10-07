import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  scheduleEngagementTimeout,
  clearEngagementTimeouts,
  getPendingEngagementTimeoutCount,
} from '../gameResults';

describe('engagement timeouts do not accumulate across rounds', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    clearEngagementTimeouts('ROOM1');
    vi.useRealTimers();
  });

  it('given a scheduled timeout, when it fires, then its handle and the empty game key are released', () => {
    const fn = vi.fn();
    scheduleEngagementTimeout('ROOM1', fn, 15000);
    expect(getPendingEngagementTimeoutCount('ROOM1')).toBe(1);

    vi.advanceTimersByTime(15000);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(getPendingEngagementTimeoutCount('ROOM1')).toBe(0);
  });

  it('given several rounds in one room, when each fires, then nothing is retained', () => {
    for (let round = 0; round < 5; round++) {
      scheduleEngagementTimeout('ROOM1', vi.fn(), 15000);
      scheduleEngagementTimeout('ROOM1', vi.fn(), 15000);
      vi.advanceTimersByTime(15000);
    }
    expect(getPendingEngagementTimeoutCount('ROOM1')).toBe(0);
  });

  it('given pending timeouts, when the game is cleared, then they never fire', () => {
    const fn = vi.fn();
    scheduleEngagementTimeout('ROOM1', fn, 15000);
    clearEngagementTimeouts('ROOM1');
    vi.advanceTimersByTime(15000);
    expect(fn).not.toHaveBeenCalled();
    expect(getPendingEngagementTimeoutCount('ROOM1')).toBe(0);
  });
});
