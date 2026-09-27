/**
 * useTimerZeroWatchdog test
 *
 * Defensive watchdog: when the MP timer reaches 0 but neither `endGame` nor
 * `timeUpdate(0)` triggers the normal result-transition path, the client gets
 * stuck on a frozen 0:00 board. The watchdog observes remainingTime hitting 0
 * after a previously-active game and triggers a recovery callback after a
 * short grace window so the loader / requestResults fallback can run.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimerZeroWatchdog } from '../useTimerZeroWatchdog';

describe('useTimerZeroWatchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('fires onTrigger after delay when remainingTime hits 0 and game was active', () => {
    const onTrigger = vi.fn();

    const { rerender } = renderHook(
      ({ remainingTime, gameActive, waitingForResults }) =>
        useTimerZeroWatchdog({
          remainingTime,
          gameActive,
          waitingForResults,
          onTrigger,
          delayMs: 100,
        }),
      { initialProps: { remainingTime: 60, gameActive: true, waitingForResults: false } }
    );

    // Game ended — timer hits 0, gameActive false, no results yet
    rerender({ remainingTime: 0, gameActive: false, waitingForResults: false });

    expect(onTrigger).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(100); });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire when waitingForResults is already true (normal path)', () => {
    const onTrigger = vi.fn();

    const { rerender } = renderHook(
      ({ remainingTime, gameActive, waitingForResults }) =>
        useTimerZeroWatchdog({
          remainingTime,
          gameActive,
          waitingForResults,
          onTrigger,
          delayMs: 100,
        }),
      { initialProps: { remainingTime: 60, gameActive: true, waitingForResults: false } }
    );

    rerender({ remainingTime: 0, gameActive: false, waitingForResults: true });

    act(() => { vi.advanceTimersByTime(500); });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does NOT fire if game was never active (mount-time 0)', () => {
    const onTrigger = vi.fn();

    renderHook(() =>
      useTimerZeroWatchdog({
        remainingTime: 0,
        gameActive: false,
        waitingForResults: false,
        onTrigger,
        delayMs: 100,
      })
    );

    act(() => { vi.advanceTimersByTime(500); });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('cancels pending trigger if waitingForResults flips to true before delay', () => {
    const onTrigger = vi.fn();

    const { rerender } = renderHook(
      ({ remainingTime, gameActive, waitingForResults }) =>
        useTimerZeroWatchdog({
          remainingTime,
          gameActive,
          waitingForResults,
          onTrigger,
          delayMs: 100,
        }),
      { initialProps: { remainingTime: 60, gameActive: true, waitingForResults: false } }
    );

    rerender({ remainingTime: 0, gameActive: false, waitingForResults: false });

    act(() => { vi.advanceTimersByTime(50); });
    expect(onTrigger).not.toHaveBeenCalled();

    // Normal path catches up before delay elapses
    rerender({ remainingTime: 0, gameActive: false, waitingForResults: true });

    act(() => { vi.advanceTimersByTime(100); });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('cancels pending trigger if a new game starts (remainingTime > 0) before delay', () => {
    const onTrigger = vi.fn();

    const { rerender } = renderHook(
      ({ remainingTime, gameActive, waitingForResults }) =>
        useTimerZeroWatchdog({
          remainingTime,
          gameActive,
          waitingForResults,
          onTrigger,
          delayMs: 100,
        }),
      { initialProps: { remainingTime: 60, gameActive: true, waitingForResults: false } }
    );

    rerender({ remainingTime: 0, gameActive: false, waitingForResults: false });
    act(() => { vi.advanceTimersByTime(50); });

    // Reset — new game arrived before watchdog fired
    rerender({ remainingTime: 180, gameActive: false, waitingForResults: false });
    act(() => { vi.advanceTimersByTime(200); });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('fires only once per zero-transition (not on every render at 0)', () => {
    const onTrigger = vi.fn();

    const { rerender } = renderHook(
      ({ remainingTime, gameActive, waitingForResults }) =>
        useTimerZeroWatchdog({
          remainingTime,
          gameActive,
          waitingForResults,
          onTrigger,
          delayMs: 100,
        }),
      { initialProps: { remainingTime: 60, gameActive: true, waitingForResults: false } }
    );

    rerender({ remainingTime: 0, gameActive: false, waitingForResults: false });
    act(() => { vi.advanceTimersByTime(100); });
    expect(onTrigger).toHaveBeenCalledTimes(1);

    // Re-render at 0 — should not re-fire (callback already triggered)
    rerender({ remainingTime: 0, gameActive: false, waitingForResults: false });
    act(() => { vi.advanceTimersByTime(500); });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});
