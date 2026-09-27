import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeason } from '../useSeason';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useSeason', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current season data', () => {
    const { result } = renderHook(() => useSeason());
    expect(result.current.currentSeason).toBeDefined();
    expect(result.current.currentSeason.id).toBe(1);
  });

  it('returns time remaining', () => {
    const { result } = renderHook(() => useSeason());
    expect(result.current.timeRemaining.days).toBeGreaterThan(0);
  });

  it('tracks peak tier from localStorage', () => {
    localStorageMock.setItem('season-1-peakTier', 'Gold');
    const { result } = renderHook(() => useSeason());
    expect(result.current.peakTier).toBe('Gold');
  });

  it('updates peak tier when ELO crosses threshold', () => {
    const { result } = renderHook(() => useSeason());
    act(() => {
      result.current.updatePeakTier(1250); // Gold threshold is 1200
    });
    expect(result.current.peakTier).toBe('Gold');
  });

  it('does not downgrade peak tier', () => {
    localStorageMock.setItem('season-1-peakTier', 'Gold');
    const { result } = renderHook(() => useSeason());
    act(() => {
      result.current.updatePeakTier(900); // Silver range
    });
    expect(result.current.peakTier).toBe('Gold');
  });

  it('returns season rewards for current peak tier', () => {
    localStorageMock.setItem('season-1-peakTier', 'Silver');
    const { result } = renderHook(() => useSeason());
    expect(result.current.seasonRewards.coins).toBe(250);
  });

  it('tracks hasSeenEndSummary flag', () => {
    const { result } = renderHook(() => useSeason());
    expect(result.current.hasSeenEndSummary).toBe(false);
    act(() => {
      result.current.dismissEndSummary();
    });
    expect(result.current.hasSeenEndSummary).toBe(true);
  });
});
