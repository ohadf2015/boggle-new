/**
 * The joined count beside the roster seats must never read LOWER than the
 * seats: a count-up restarting from 0 once showed "1 joined" beside three
 * filled seats.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRisingCount } from '../useRisingCount';

afterEach(() => vi.useRealTimers());

describe('useRisingCount', () => {
  it('Given the first read, Then it shows the true number at once (a page load is not an event)', () => {
    const { result } = renderHook(({ n, animate }) => useRisingCount(n, animate), {
      initialProps: { n: 0, animate: false },
    });
    expect(result.current).toBe(0);
  });

  it('Given the first settled read of 3 with no arrivals, Then it jumps straight to 3', () => {
    const { result, rerender } = renderHook(({ n, animate }) => useRisingCount(n, animate), {
      initialProps: { n: 0, animate: false },
    });
    rerender({ n: 3, animate: false });
    expect(result.current).toBe(3);
  });

  it('Given a class of 3 when a 4th arrives, Then it steps 3 → 4 and never dips below 3', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ n, animate }) => useRisingCount(n, animate), {
      initialProps: { n: 3, animate: false },
    });
    rerender({ n: 4, animate: true });
    const seen: number[] = [result.current];
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        vi.advanceTimersByTime(140);
      });
      seen.push(result.current);
    }
    expect(Math.min(...seen)).toBe(3);
    expect(result.current).toBe(4);
  });

  it('Given reduced motion (animate false), Then an arrival snaps to the new count', () => {
    const { result, rerender } = renderHook(({ n, animate }) => useRisingCount(n, animate), {
      initialProps: { n: 3, animate: false },
    });
    rerender({ n: 5, animate: false });
    expect(result.current).toBe(5);
  });

  it('Given a student removed or a class switched, Then the count snaps down', () => {
    const { result, rerender } = renderHook(({ n, animate }) => useRisingCount(n, animate), {
      initialProps: { n: 6, animate: false },
    });
    rerender({ n: 2, animate: true });
    expect(result.current).toBe(2);
  });
});
