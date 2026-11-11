import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStudentReveal } from '../useStudentReveal';

describe('useStudentReveal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given motion is allowed, when results mount, then the beats arrive in order and settle', () => {
    const { result } = renderHook(() => useStudentReveal(false));
    expect(result.current).toBe('rank');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe('verdict');
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current).toBe('chest');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe('done');
  });

  it('given reduced motion, when results mount, then the very first render is the final state', () => {
    const { result } = renderHook(() => useStudentReveal(true));
    expect(result.current).toBe('done');
  });

  it('given the screen unmounts mid-reveal, then no beat fires afterwards', () => {
    const { unmount } = renderHook(() => useStudentReveal(false));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
