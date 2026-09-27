import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDailyChallengeStats } from '@/hooks/useDailyChallengeStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

vi.mock('@/hooks/useSafeTimeout', () => ({
  useInterval: () => {},
}));

// Control the localStorage-backed daily helpers so we can isolate the
// preloaded-server-snapshot resolution path (the source of the CTA flicker).
const mockGetWordHuntStatusToday = vi.fn();
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-07-06',
  getPuzzleNumber: () => 173,
  getSecondsUntilNextDaily: () => 3600,
  formatCountdown: () => '01:00:00',
  getWordHuntStatusToday: (...args: unknown[]) => mockGetWordHuntStatusToday(...args),
  getDailyStreak: () => ({ currentStreak: 0 }),
}));

describe('useDailyChallengeStats — loading contract', () => {
  beforeEach(() => {
    mockGetWordHuntStatusToday.mockReset();
    mockGetWordHuntStatusToday.mockReturnValue(null);
  });

  it('stays loading while an authed server snapshot is still pending', () => {
    // preloadedStats.loading === true and no local status → the outcome is unknown,
    // so the hook must report loading (consumers render the pessimistic state).
    const { result } = renderHook(() =>
      useDailyChallengeStats({ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: true }),
    );
    expect(result.current.loading).toBe(true);
  });

  it('resolves (loading=false) once the server snapshot lands', () => {
    const { result } = renderHook(() =>
      useDailyChallengeStats({ hasPlayed: true, hasSolved: true, currentStreak: 4, loading: false }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.hasPlayed).toBe(true);
  });

  it('resolves immediately from local status even if the server snapshot is still loading', () => {
    mockGetWordHuntStatusToday.mockReturnValue({ solved: true });
    const { result } = renderHook(() =>
      useDailyChallengeStats({ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: true }),
    );
    // Local completion is authoritative for "I played today on this device".
    expect(result.current.loading).toBe(false);
    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.hasSolved).toBe(true);
  });
});
