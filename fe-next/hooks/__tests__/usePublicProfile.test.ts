/**
 * usePublicProfile Hook Tests
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePublicProfile } from '../usePublicProfile';
import type { PublicProfile } from '@/shared/types/publicProfile';

const MOCK_PROFILE: PublicProfile = {
  id: 'user-123',
  username: 'WordMaster',
  displayName: 'Word Master',
  customAvatar: null,
  countryCode: 'US',
  currentLevel: 15,
  totalXp: 5200,
  totalGames: 100,
  totalScore: 25000,
  totalWords: 1500,
  winRate: 40,
  longestWord: 'EXTRAORDINARY',
  longestWordLength: 13,
  achievementCounts: {},
  memberSince: '2025-06',
  percentile: 4,
};

describe('usePublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches profile successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PROFILE),
    });

    const { result } = renderHook(() => usePublicProfile('WordMaster'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(MOCK_PROFILE);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/player-profile/WordMaster');
  });

  it('handles 404 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => usePublicProfile('NonExistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBe('PLAYER_NOT_FOUND');
  });

  it('handles network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePublicProfile('WordMaster'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBe('FETCH_ERROR');
  });

  it('does not fetch when username is undefined', async () => {
    global.fetch = vi.fn();

    const { result } = renderHook(() => usePublicProfile(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('encodes username in URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PROFILE),
    });

    renderHook(() => usePublicProfile('Word Master'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/player-profile/Word%20Master');
    });
  });
});
