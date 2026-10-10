import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
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
