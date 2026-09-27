import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimedReveal } from '../useTimedReveal';

describe('useTimedReveal (mascot reveal-on-event gate)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is hidden on mount before any trigger', () => {
    const { result } = renderHook(({ k }) => useTimedReveal(k, 1000), { initialProps: { k: 0 } });
    expect(result.current).toBe(false);
  });

  it('reveals when the trigger key bumps, then hides after the duration', () => {
    const { result, rerender } = renderHook(({ k }) => useTimedReveal(k, 1000), { initialProps: { k: 0 } });
    act(() => rerender({ k: 1 }));
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(false);
  });

  it('re-reveals and extends the window on a subsequent bump', () => {
    const { result, rerender } = renderHook(({ k }) => useTimedReveal(k, 1000), { initialProps: { k: 0 } });
    act(() => rerender({ k: 1 }));
    act(() => { vi.advanceTimersByTime(800); });
    act(() => rerender({ k: 2 }));
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(800); }); // 800ms into the SECOND window
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(300); }); // past the second window
    expect(result.current).toBe(false);
  });
});
