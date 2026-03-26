/**
 * useUserStats Hook Tests
 *
 * Tests hook that fetches user statistics for feature gating
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserStats } from '../useUserStats';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/contexts/AuthContext');

describe('useUserStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null stats for unauthenticated users', () => {
    // GIVEN - No authenticated user
    (useAuth as any).mockReturnValue({
      user: null,
      profile: null,
      loading: false, // AuthContext uses 'loading', not 'isLoading'
    });

    // WHEN
    const { result } = renderHook(() => useUserStats());

    // THEN
    expect(result.current.userStats).toBeNull();
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
