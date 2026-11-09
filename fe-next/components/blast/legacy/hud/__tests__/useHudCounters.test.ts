import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedScore } from '../useHudCounters';

describe('useAnimatedScore', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never shows a value outside the old and new score when the frame time is before the start', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frame = cb; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    const { result, rerender } = renderHook(({ target }) => useAnimatedScore(target), { initialProps: { target: 34 } });
    rerender({ target: 45 });
    // The frame began 300ms before the animation started: an unclamped t would be negative.
    act(() => frame?.(700));
    expect(result.current.display).toBeGreaterThanOrEqual(34);
    expect(result.current.display).toBeLessThanOrEqual(45);
    act(() => frame?.(5000));
    expect(result.current.display).toBe(45);
  });
});
