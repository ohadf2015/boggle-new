import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  holdQuickResultsCalm,
  isQuickResultsOnScreen,
  setQuickResultsOnScreen,
  useQuickResultsOnScreen,
} from '../resultsCalm';

afterEach(() => setQuickResultsOnScreen(false));

describe('quick results on-screen flag', () => {
  it('starts off', () => {
    expect(isQuickResultsOnScreen()).toBe(false);
  });

  it('reports on while set and off once cleared', () => {
    setQuickResultsOnScreen(true);
    expect(isQuickResultsOnScreen()).toBe(true);
    setQuickResultsOnScreen(false);
    expect(isQuickResultsOnScreen()).toBe(false);
  });

  it('re-renders hook subscribers when the flag flips', () => {
    const { result } = renderHook(() => useQuickResultsOnScreen());
    expect(result.current).toBe(false);
    act(() => setQuickResultsOnScreen(true));
    expect(result.current).toBe(true);
  });
});

describe('holdQuickResultsCalm', () => {
  it('holds the signup nudge through the celebration, then lets it through', () => {
    vi.useFakeTimers();
    const release = holdQuickResultsCalm(4000);
    expect(isQuickResultsOnScreen()).toBe(true);
    vi.advanceTimersByTime(3900);
    expect(isQuickResultsOnScreen()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(isQuickResultsOnScreen()).toBe(false);
    release();
    vi.useRealTimers();
  });

  it('lets go at once when the screen unmounts early', () => {
    vi.useFakeTimers();
    const release = holdQuickResultsCalm(4000);
    release();
    expect(isQuickResultsOnScreen()).toBe(false);
    vi.useRealTimers();
  });
});
