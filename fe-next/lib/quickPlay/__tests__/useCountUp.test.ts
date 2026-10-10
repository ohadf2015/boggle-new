import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountUp', () => {
  it('holds at zero until its delay, then climbs to the target', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(500, { delay: 300, duration: 600 }));
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(500);

    act(() => vi.advanceTimersByTime(600));
    expect(result.current).toBe(500);
  });

  it('shows the target at once when motion is off', () => {
    const { result } = renderHook(() => useCountUp(42, { delay: 300, duration: 600, enabled: false }));
    expect(result.current).toBe(42);
  });

  it('never overshoots or goes fractional', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(7, { delay: 0, duration: 400 }));
    for (let i = 0; i < 30; i++) {
      act(() => vi.advanceTimersByTime(16));
      expect(Number.isInteger(result.current)).toBe(true);
      expect(result.current).toBeLessThanOrEqual(7);
    }
    expect(result.current).toBe(7);
  });
});
