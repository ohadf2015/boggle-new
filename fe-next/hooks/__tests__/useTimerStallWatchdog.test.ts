/**
 * useTimerStallWatchdog test
 *
 * MP "timer frozen mid-game" recovery watchdog. Server keeps ticking and
 * emits `timeUpdate` every second, but the client display can freeze when:
 *   - `gameSessionId` filter rejects emits after a stale session ref
 *   - server clock hasn't actually started (countdownComplete never reached)
 *   - socket transport buffered emits during a tab/network blip
 *
 * When `remainingTime` stays unchanged for `stallMs` while game is active,
 * fire `onStall` so the caller can `socket.emit('requestGameState')` to
 * force a fresh sync from the server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimerStallWatchdog } from '../useTimerStallWatchdog';

describe('useTimerStallWatchdog', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

  const baseProps = {
    remainingTime: 120,
    gameActive: true,
    waitingForResults: false,
    stallMs: 5000,
  } as const;

  it('fires onStall after stallMs when remainingTime stays unchanged during active game', () => {
    const onStall = vi.fn();
    renderHook(() => useTimerStallWatchdog({ ...baseProps, onStall }));

    act(() => { vi.advanceTimersByTime(4999); });
    expect(onStall).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire when remainingTime decreases (normal ticking)', () => {
    const onStall = vi.fn();
    const { rerender } = renderHook(
      (p) => useTimerStallWatchdog({ ...p, onStall }),
      { initialProps: { ...baseProps } }
    );

    for (let t = 119; t >= 110; t--) {
      act(() => { vi.advanceTimersByTime(1000); });
      rerender({ ...baseProps, remainingTime: t });
    }
    expect(onStall).not.toHaveBeenCalled();
  });

  it('does NOT fire when gameActive is false', () => {
    const onStall = vi.fn();
    renderHook(() => useTimerStallWatchdog({ ...baseProps, gameActive: false, onStall }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onStall).not.toHaveBeenCalled();
  });

  it('does NOT fire when waitingForResults is true', () => {
    const onStall = vi.fn();
    renderHook(() => useTimerStallWatchdog({ ...baseProps, waitingForResults: true, onStall }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onStall).not.toHaveBeenCalled();
  });

  it('does NOT fire when remainingTime is 0 (zero-watchdog handles that)', () => {
    const onStall = vi.fn();
    renderHook(() => useTimerStallWatchdog({ ...baseProps, remainingTime: 0, onStall }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onStall).not.toHaveBeenCalled();
  });

  it('does NOT fire when remainingTime is null', () => {
    const onStall = vi.fn();
    renderHook(() => useTimerStallWatchdog({ ...baseProps, remainingTime: null, onStall }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onStall).not.toHaveBeenCalled();
  });

  it('fires only once for the same stuck value (no re-fire while frozen)', () => {
    const onStall = vi.fn();
    const { rerender } = renderHook(
      (p) => useTimerStallWatchdog({ ...p, onStall }),
      { initialProps: { ...baseProps } }
    );

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onStall).toHaveBeenCalledTimes(1);

    rerender({ ...baseProps });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it('re-arms after value changes — next stall fires again', () => {
    const onStall = vi.fn();
    const { rerender } = renderHook(
      (p) => useTimerStallWatchdog({ ...p, onStall }),
      { initialProps: { ...baseProps } }
    );

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onStall).toHaveBeenCalledTimes(1);

    rerender({ ...baseProps, remainingTime: 119 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ ...baseProps, remainingTime: 119 });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onStall).toHaveBeenCalledTimes(2);
  });

  it('cancels pending stall if value changes before stallMs elapses', () => {
    const onStall = vi.fn();
    const { rerender } = renderHook(
      (p) => useTimerStallWatchdog({ ...p, onStall }),
      { initialProps: { ...baseProps } }
    );

    act(() => { vi.advanceTimersByTime(4000); });
    rerender({ ...baseProps, remainingTime: 119 });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(onStall).not.toHaveBeenCalled();
  });

  it('cancels pending stall if gameActive flips false', () => {
    const onStall = vi.fn();
    const { rerender } = renderHook(
      (p) => useTimerStallWatchdog({ ...p, onStall }),
      { initialProps: { ...baseProps } }
    );

    act(() => { vi.advanceTimersByTime(4000); });
    rerender({ ...baseProps, gameActive: false });
    act(() => { vi.advanceTimersByTime(5000); });

    expect(onStall).not.toHaveBeenCalled();
  });
});
