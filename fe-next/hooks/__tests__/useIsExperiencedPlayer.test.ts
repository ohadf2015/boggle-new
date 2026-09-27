/**
 * useIsExperiencedPlayer Hook Tests
 *
 * Returns true when the player has played enough games (or already
 * completed onboarding) to skip explanatory hints/tutorials.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsExperiencedPlayer, EXPERIENCED_THRESHOLD } from '../useIsExperiencedPlayer';
import { useUserStats } from '../useUserStats';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';

vi.mock('../useUserStats');
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: vi.fn(),
}));

const mockUseUserStats = useUserStats as unknown as ReturnType<typeof vi.fn>;
const mockHasCompletedOnboarding = hasCompletedOnboarding as unknown as ReturnType<typeof vi.fn>;

describe('useIsExperiencedPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasCompletedOnboarding.mockReturnValue(false);
  });

  it('returns false while stats still loading', () => {
    mockUseUserStats.mockReturnValue({ userStats: null, isLoading: true });
    const { result } = renderHook(() => useIsExperiencedPlayer());
    expect(result.current).toBe(false);
  });

  it('returns false for brand new player (0 games, no onboarding)', () => {
    mockUseUserStats.mockReturnValue({
      userStats: { totalGamesPlayed: 0 },
      isLoading: false,
    });
    const { result } = renderHook(() => useIsExperiencedPlayer());
    expect(result.current).toBe(false);
  });

  it('returns false below threshold', () => {
    mockUseUserStats.mockReturnValue({
      userStats: { totalGamesPlayed: EXPERIENCED_THRESHOLD - 1 },
      isLoading: false,
    });
    const { result } = renderHook(() => useIsExperiencedPlayer());
    expect(result.current).toBe(false);
  });

  it('returns true at or above threshold', () => {
    mockUseUserStats.mockReturnValue({
      userStats: { totalGamesPlayed: EXPERIENCED_THRESHOLD },
      isLoading: false,
    });
    const { result } = renderHook(() => useIsExperiencedPlayer());
    expect(result.current).toBe(true);
  });

  it('returns true even with 0 games when onboarding marked complete', () => {
    mockUseUserStats.mockReturnValue({
      userStats: { totalGamesPlayed: 0 },
      isLoading: false,
    });
    mockHasCompletedOnboarding.mockReturnValue(true);
    const { result } = renderHook(() => useIsExperiencedPlayer());
    expect(result.current).toBe(true);
  });
});
