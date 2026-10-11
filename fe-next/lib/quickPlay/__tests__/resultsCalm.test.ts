import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  holdQuickResultsCalm,
  isQuickResultsOnScreen,
  resetQuickResultsCalmForTests,
  useQuickResultsOnScreen,
} from '../resultsCalm';
import { overlayQuietZoneReason, resetOverlayQuietZoneForTests } from '@/lib/overlayQuietZone';

afterEach(() => {
  resetQuickResultsCalmForTests();
  resetOverlayQuietZoneForTests();
});

describe('quick results on-screen flag', () => {
  it('starts off', () => {
    expect(isQuickResultsOnScreen()).toBe(false);
  });

  it('reports on while held and off once released', () => {
    const release = holdQuickResultsCalm(10_000);
    expect(isQuickResultsOnScreen()).toBe(true);
    release();
    expect(isQuickResultsOnScreen()).toBe(false);
  });

  it('re-renders hook subscribers when the flag flips', () => {
    const { result } = renderHook(() => useQuickResultsOnScreen());
    expect(result.current).toBe(false);
    act(() => {
      holdQuickResultsCalm(10_000);
    });
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

  it('keeps every other overlay (install promo, push prompt) off the reveal too', () => {
    vi.useFakeTimers();
    const release = holdQuickResultsCalm(4000);
    expect(overlayQuietZoneReason()).toBe('quick-results');
    vi.advanceTimersByTime(4100);
    expect(overlayQuietZoneReason()).not.toBe('quick-results');
    release();
    vi.useRealTimers();
  });

  it('stays held while any holder remains, so the hub can hand over to the results screen', () => {
    const bridge = holdQuickResultsCalm(10_000);
    const screenHold = holdQuickResultsCalm(10_000);
    bridge();
    expect(isQuickResultsOnScreen()).toBe(true);
    screenHold();
    expect(isQuickResultsOnScreen()).toBe(false);
  });

  it('lets go at once when the screen unmounts early', () => {
    vi.useFakeTimers();
    const release = holdQuickResultsCalm(4000);
    release();
    expect(isQuickResultsOnScreen()).toBe(false);
    vi.useRealTimers();
  });
});
