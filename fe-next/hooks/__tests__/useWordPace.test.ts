import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordPace } from '../useWordPace';

describe('useWordPace', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with normal tier', () => {
    const { result } = renderHook(() => useWordPace());
    const state = result.current.getPaceState();
    expect(state.tier).toBe('normal');
    expect(state.recentWpm).toBe(0);
  });

  it('should track words and compute WPM', () => {
    const { result } = renderHook(() => useWordPace());

    // Record 6 words over 30 seconds = 12 WPM
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(5000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(5000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(5000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(5000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(5000);
    act(() => { result.current.recordWord(); });

    const state = result.current.getPaceState();
    expect(state.averageWpm).toBeGreaterThan(0);
    expect(state.recentWpm).toBeGreaterThan(0);
  });

  it('should detect blazing pace when recent WPM is 2x+ average', () => {
    const { result } = renderHook(() => useWordPace());

    // Slow start: 3 words over 60 seconds
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(20000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(20000);
    act(() => { result.current.recordWord(); });
    vi.advanceTimersByTime(20000);

    // Now burst: 6 words in 10 seconds (36 WPM recent vs ~3 WPM average)
    for (let i = 0; i < 10; i++) {
      act(() => { result.current.recordWord(); });
      vi.advanceTimersByTime(1000);
    }

    const state = result.current.getPaceState();
    expect(['fast', 'blazing']).toContain(state.tier);
    expect(state.paceRatio).toBeGreaterThanOrEqual(1.5);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useWordPace());

    act(() => { result.current.recordWord(); });
    act(() => { result.current.recordWord(); });
    act(() => { result.current.reset(); });

    const state = result.current.getPaceState();
    expect(state.tier).toBe('normal');
    expect(state.recentWpm).toBe(0);
  });
});
