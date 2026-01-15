import { renderHook, act } from '@testing-library/react';
import { useSafeInterval, useSafeTimeout } from '../useSafeTimeout';

describe('useSafeInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call callback at regular intervals', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useSafeInterval());

    act(() => {
      result.current.start(callback, 1000);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should stop interval when stop is called', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useSafeInterval());

    act(() => {
      result.current.start(callback, 1000);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stop();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should return stable references to prevent infinite effect loops', () => {
    const { result, rerender } = renderHook(() => useSafeInterval());

    const firstStart = result.current.start;
    const firstStop = result.current.stop;
    const firstResult = result.current;

    rerender();

    // The returned object should have stable function references
    // This is critical for useEffect dependencies
    expect(result.current.start).toBe(firstStart);
    expect(result.current.stop).toBe(firstStop);

    // The returned object itself should be stable (memoized)
    // Otherwise using it in a dependency array causes infinite re-renders
    expect(result.current).toBe(firstResult);
  });

  it('should not restart interval when component rerenders', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(() => useSafeInterval());

    act(() => {
      result.current.start(callback, 1000);
    });

    // Advance 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Rerender should not affect the interval
    rerender();

    // Advance another 500ms (should trigger callback at 1000ms total)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Verify it keeps running
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('useSafeTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return stable references to prevent infinite effect loops', () => {
    const { result, rerender } = renderHook(() => useSafeTimeout());

    const firstSet = result.current.set;
    const firstClear = result.current.clear;
    const firstResult = result.current;

    rerender();

    // The returned object should have stable function references
    expect(result.current.set).toBe(firstSet);
    expect(result.current.clear).toBe(firstClear);

    // The returned object itself should be stable (memoized)
    expect(result.current).toBe(firstResult);
  });
});
