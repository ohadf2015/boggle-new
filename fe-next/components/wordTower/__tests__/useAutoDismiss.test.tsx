import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoDismiss } from '../useAutoDismiss';

describe('useAutoDismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('clears the active value once after the delay', () => {
    const clear = vi.fn();
    renderHook(({ token }) => useAutoDismiss(token, clear, 2000), {
      initialProps: { token: 'a' as string | null },
    });
    expect(clear).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does NOT schedule when the value is null', () => {
    const clear = vi.fn();
    renderHook(() => useAutoDismiss(null, clear, 2000));
    act(() => vi.advanceTimersByTime(5000));
    expect(clear).not.toHaveBeenCalled();
  });

  // The core regression: a re-render with the SAME token must not cancel the
  // pending dismissal. (The old inline pattern cleared the timer on every parent
  // re-render and only rescheduled when a NEW event fired — so toasts froze.)
  it('keeps the dismissal pending across re-renders with the same token', () => {
    const clear = vi.fn();
    const { rerender } = renderHook(({ token }) => useAutoDismiss(token, clear, 2000), {
      initialProps: { token: 'a' as string | null },
    });
    // A flurry of re-renders (e.g. height ticks) with the SAME active toast.
    rerender({ token: 'a' });
    rerender({ token: 'a' });
    act(() => vi.advanceTimersByTime(2000));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('reschedules when the token changes to a new value', () => {
    const clear = vi.fn();
    const { rerender } = renderHook(({ token }) => useAutoDismiss(token, clear, 2000), {
      initialProps: { token: 'a' as string | null },
    });
    act(() => vi.advanceTimersByTime(1000));
    rerender({ token: 'b' }); // new event before the first dismissed
    act(() => vi.advanceTimersByTime(1000)); // 2000 total, but only 1000 since 'b'
    expect(clear).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); // now 2000 since 'b'
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('uses the latest clear callback without rescheduling', () => {
    const clearA = vi.fn();
    const clearB = vi.fn();
    const { rerender } = renderHook(({ clear }) => useAutoDismiss('a', clear, 2000), {
      initialProps: { clear: clearA },
    });
    rerender({ clear: clearB }); // identity change must NOT reset the timer
    act(() => vi.advanceTimersByTime(2000));
    expect(clearA).not.toHaveBeenCalled();
    expect(clearB).toHaveBeenCalledTimes(1);
  });
});
