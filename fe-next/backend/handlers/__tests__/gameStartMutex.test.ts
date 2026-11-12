import { vi, describe, it, expect, afterEach } from 'vitest';
import {
  tryAcquireGameStart, releaseGameStart, waitForGameStart, isGameStarting, isGameStartStale,
  startWaiterCount, START_WAIT_CAP_MS, STALE_START_MS,
} from '../gameStartMutex';

afterEach(() => {
  releaseGameStart('G1');
  vi.useRealTimers();
});

describe('gameStartMutex', () => {
  it('Given a start in flight, When it is released, Then every waiter resolves true', async () => {
    tryAcquireGameStart('G1');
    const waiting = waitForGameStart('G1');
    releaseGameStart('G1');
    await expect(waiting).resolves.toBe(true);
    expect(isGameStarting('G1')).toBe(false);
  });

  it('Given a wedged start, When the last waiter times out, Then it resolves false and leaves no empty waiter list', async () => {
    vi.useFakeTimers();
    tryAcquireGameStart('G1');
    const waiting = waitForGameStart('G1');
    expect(startWaiterCount('G1')).toBe(1);
    await vi.advanceTimersByTimeAsync(START_WAIT_CAP_MS);
    await expect(waiting).resolves.toBe(false);
    expect(startWaiterCount('G1')).toBe(0);
  });

  it('Given a start held past the cap plus a margin, Then it reads as stale; a fresh one does not', async () => {
    vi.useFakeTimers();
    tryAcquireGameStart('G1');
    expect(isGameStartStale('G1')).toBe(false);
    await vi.advanceTimersByTimeAsync(STALE_START_MS + 1);
    expect(isGameStartStale('G1')).toBe(true);
    releaseGameStart('G1');
    expect(isGameStartStale('G1')).toBe(false);
  });
});
