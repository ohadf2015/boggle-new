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
import { roundEndTimeline } from '@/lib/education/roundEndStage';

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

  // Driven off the timetable, not off literals: the gaps were stretched once
  // already (a 2.6s reveal was over before a capture's shutter opened) and a
  // test that hardcodes them just has to be edited again next time.
  it('walks third, second, then the winner', () => {
    const at = (stage: string) => roundEndTimeline().find((s) => s.stage === stage)!.at;
    const { result } = renderHook(() => useRoundEndReveal(true));
    act(() => { vi.advanceTimersByTime(at('third')); });
    expect(result.current).toBe('third');
    act(() => { vi.advanceTimersByTime(at('second') - at('third')); });
    expect(result.current).toBe('second');
    act(() => { vi.advanceTimersByTime(at('first') - at('second')); });
    expect(result.current).toBe('first');
  });

  it('settles on the resting stage', () => {
    const { result } = renderHook(() => useRoundEndReveal(true));
    act(() => { vi.advanceTimersByTime(10000); });
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
