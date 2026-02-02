/**
 * useUserStats Hook Tests
 *
 * Tests hook that fetches user statistics for feature gating
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useUserStats } from '../useUserStats';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/contexts/AuthContext');

describe('useUserStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null stats for unauthenticated users', () => {
    // GIVEN - No authenticated user
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN
    expect(result.current.userStats).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return stats for authenticated users', () => {
    // GIVEN - Authenticated user with profile
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 10,
      },
      isLoading: false,
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
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isLoading: true,
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN
    expect(result.current.userStats).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle profile without total_games field', () => {
    // GIVEN - Profile exists but no total_games
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        // total_games missing
      },
      isLoading: false,
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

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 5,
      },
      isLoading: false,
    });

    // WHEN - Profile updates to 6 games
    rerender();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: {
        id: 'user-123',
        total_games: 6,
      },
      isLoading: false,
    });

    rerender();

    // THEN
    expect(result.current.userStats).toEqual({
      totalGamesPlayed: 6,
    });
  });
});
