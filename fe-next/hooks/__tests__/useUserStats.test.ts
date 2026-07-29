/**
 * useUserStats Hook Tests
 *
 * Tests hook that fetches user statistics for feature gating
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserStats } from '../useUserStats';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestStats } from '@/utils/guestManager';

vi.mock('@/contexts/AuthContext');
vi.mock('@/utils/guestManager', () => ({
  getGuestStats: vi.fn(),
}));

const mockGetGuestStats = getGuestStats as unknown as ReturnType<typeof vi.fn>;

describe('useUserStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGuestStats.mockReturnValue({ games: 0, wins: 0, score: 0, words: 0 });
  });

  it('should fall back to guest stats for unauthenticated users (was: returned null)', () => {
    // GIVEN - No authenticated user, but guest has played 2 games
    (useAuth as any).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    });
    mockGetGuestStats.mockReturnValue({ games: 2, wins: 0, score: 100, words: 8 });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN - Guest stats surface so unlock notifications can fire for anon users
    expect(result.current.userStats).toEqual({ totalGamesPlayed: 2 });
    expect(result.current.isLoading).toBe(false);
  });

  it('should return zero-game stats for unauthenticated users with no guest history', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    });
    mockGetGuestStats.mockReturnValue({ games: 0, wins: 0, score: 0, words: 0 });

    const { result } = renderHook(() => useUserStats());

    expect(result.current.userStats).toEqual({ totalGamesPlayed: 0 });
    expect(result.current.isLoading).toBe(false);
  });

  it('should return stats for authenticated users', () => {
    // GIVEN - Authenticated user with profile
    (useAuth as any).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 10,
      },
      loading: false, // AuthContext uses 'loading', not 'isLoading'
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN
    expect(result.current.userStats).toEqual({
      totalGamesPlayed: 10,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle loading state', () => {
    // GIVEN - Auth is still loading
    (useAuth as any).mockReturnValue({
      user: null,
      profile: null,
      loading: true, // AuthContext uses 'loading', not 'isLoading'
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN
    expect(result.current.userStats).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle profile without total_games field', () => {
    // GIVEN - Profile exists but no total_games
    (useAuth as any).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        // total_games missing
      },
      loading: false, // AuthContext uses 'loading', not 'isLoading'
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN - Defaults to 0
    expect(result.current.userStats).toEqual({
      totalGamesPlayed: 0,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('should update when profile changes', () => {
    // GIVEN - Initial profile with 5 games
    const { result, rerender } = renderHook(() => useUserStats());

    (useAuth as any).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 5,
      },
      loading: false, // AuthContext uses 'loading', not 'isLoading'
    });

    // WHEN - Profile updates to 6 games
    rerender();

    (useAuth as any).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 6,
      },
      loading: false, // AuthContext uses 'loading', not 'isLoading'
    });

    rerender();

    // THEN
    expect(result.current.userStats).toEqual({
      totalGamesPlayed: 6,
    });
  });
});
