import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the daily-challenge barrel so we control localStorage truthiness + the
// "today" puzzle deterministically.
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: vi.fn(() => '2026-06-20'),
  getPuzzleNumber: vi.fn(() => 42),
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '01:00:00'),
  getWordHuntStatusToday: vi.fn(() => null as { solved: boolean } | null),
  getDailyStreak: vi.fn(() => ({ currentStreak: 7 })),
}));

// useInterval is a no-op in these tests — we only assert the resolved status.
vi.mock('@/hooks/useSafeTimeout', () => ({ useInterval: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

import { getWordHuntStatusToday, getDailyStreak } from '@/utils/dailyChallenge';
import { useDailyChallengeStats } from '../useDailyChallengeStats';

describe('useDailyChallengeStats — local completion wins over stale preloaded stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWordHuntStatusToday).mockReturnValue(null);
    vi.mocked(getDailyStreak).mockReturnValue({ currentStreak: 7 } as ReturnType<typeof getDailyStreak>);
  });

  it('reflects a just-completed daily from localStorage even when preloaded server stats say not-played', () => {
    // Player finished today's daily (localStorage written by saveWordHuntResult),
    // then navigated home via client-side routing — no focus/visibility event.
    // The preloaded server snapshot is stale (hasPlayed:false).
    vi.mocked(getWordHuntStatusToday).mockReturnValue({ solved: true });

    const { result } = renderHook(() =>
      useDailyChallengeStats({
        hasPlayed: false,
        hasSolved: null,
        currentStreak: 0,
        puzzleNumber: 42,
        loading: false,
      }),
    );

    // Fresh local truth must win.
    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.hasSolved).toBe(true);
    expect(result.current.streak).toBe(7);
  });

  it('falls back to preloaded server stats when localStorage has no result yet', () => {
    vi.mocked(getWordHuntStatusToday).mockReturnValue(null);

    const { result } = renderHook(() =>
      useDailyChallengeStats({
        hasPlayed: true,
        hasSolved: true,
        currentStreak: 3,
        puzzleNumber: 42,
        loading: false,
      }),
    );

    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.hasSolved).toBe(true);
    expect(result.current.streak).toBe(3);
  });
});
