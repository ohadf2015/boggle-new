/**
 * useCrazyGamesFriends hook tests
 */
import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockListFriends } = vi.hoisted(() => {
  const mockListFriends = vi.fn();
  return { mockListFriends };
});
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    listFriends: mockListFriends,
  }),
}));

import { useCrazyGamesFriends } from '../useCrazyGamesFriends';

describe('useCrazyGamesFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty friends list', () => {
    const { result } = renderHook(() => useCrazyGamesFriends());
    expect(result.current.friends).toEqual([]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('loads first page of friends', async () => {
    const mockFriends = [
      { id: '1', username: 'Alice', profilePictureUrl: 'https://example.com/alice.png' },
      { id: '2', username: 'Bob', profilePictureUrl: 'https://example.com/bob.png' },
    ];
    mockListFriends.mockResolvedValue({ friends: mockFriends, hasMore: true });

    const { result } = renderHook(() => useCrazyGamesFriends());

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.friends).toEqual(mockFriends);
    expect(result.current.hasMore).toBe(true);
    expect(mockListFriends).toHaveBeenCalledWith(0, 50);
  });

  it('appends subsequent pages', async () => {
    const page1 = [{ id: '1', username: 'Alice', profilePictureUrl: '' }];
    const page2 = [{ id: '2', username: 'Bob', profilePictureUrl: '' }];
    mockListFriends
      .mockResolvedValueOnce({ friends: page1, hasMore: true })
      .mockResolvedValueOnce({ friends: page2, hasMore: false });

    const { result } = renderHook(() => useCrazyGamesFriends());

    await act(async () => { await result.current.loadMore(); });
    await act(async () => { await result.current.loadMore(); });

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
    expect(mockListFriends).toHaveBeenCalledTimes(2);
  });

  it('stops loading when hasMore is false', async () => {
    mockListFriends.mockResolvedValue({ friends: [], hasMore: false });

    const { result } = renderHook(() => useCrazyGamesFriends());

    await act(async () => { await result.current.loadMore(); });
    await act(async () => { await result.current.loadMore(); }); // Should be no-op

    expect(mockListFriends).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully', async () => {
    mockListFriends.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCrazyGamesFriends());

    await act(async () => { await result.current.loadMore(); });

    expect(result.current.friends).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('refresh resets and reloads from page 0', async () => {
    const initialFriends = [{ id: '1', username: 'Alice', profilePictureUrl: '' }];
    const refreshedFriends = [{ id: '3', username: 'Charlie', profilePictureUrl: '' }];
    mockListFriends
      .mockResolvedValueOnce({ friends: initialFriends, hasMore: true })
      .mockResolvedValueOnce({ friends: refreshedFriends, hasMore: false });

    const { result } = renderHook(() => useCrazyGamesFriends());

    await act(async () => { await result.current.loadMore(); });
    expect(result.current.friends).toEqual(initialFriends);

    await act(async () => { await result.current.refresh(); });
    expect(result.current.friends).toEqual(refreshedFriends);
    expect(mockListFriends).toHaveBeenLastCalledWith(0, 50);
  });
});
