/**
 * The reveal clock.
 *
 * It walks the timetable in `lib/education/roundEndStage`, and it has exactly
 * one safety rule: every path that is not a played-out reveal starts on the
 * RESTING stage. Reduced motion, a disabled reveal, a server render — all land
 * fully painted, because the resting state is the one a screenshot has to be
 * able to catch (Pitfall Class 5, and the original reason this podium was
 * frozen static).
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRoundEndReveal } from '../useRoundEndReveal';

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('useRoundEndReveal', () => {
  beforeEach(() => {
    setReducedMotion(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the painted stage, not on a blank one', () => {
    const { result } = renderHook(() => useRoundEndReveal(true));
    expect(result.current).toBe('stage');
  });

  it('walks third, second, then the winner', () => {
    const { result } = renderHook(() => useRoundEndReveal(true));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('third');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('second');
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current).toBe('first');
  });

  it('settles on the resting stage', () => {
    const { result } = renderHook(() => useRoundEndReveal(true));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe('done');
  });

  it('starts fully painted when the reveal is switched off', () => {
    const { result } = renderHook(() => useRoundEndReveal(false));
    expect(result.current).toBe('done');
  });

  it('starts fully painted under prefers-reduced-motion', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useRoundEndReveal(true));
    expect(result.current).toBe('done');
  });

  it('drops its timers on unmount so a rematch cannot be interrupted by the old round', () => {
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderHook(() => useRoundEndReveal(true));
    unmount();
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});
