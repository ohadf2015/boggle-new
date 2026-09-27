/**
 * useFriends — friend_added event tracking
 *
 * Verifies that trackGrowthEvent('friend_added') is fired when
 * acceptFriendRequest succeeds, and NOT fired on failure.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, friendsApi, mockTrackGrowthEvent } = vi.hoisted(() => {
  const fakeSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
  const mockUseAuth = vi.fn(() => ({ isAuthenticated: true, user: { id: 'user-a' } }));
  const mockSocketCtx = vi.fn(() => ({ socket: fakeSocket, isConnected: true }));
  const mockTrackGrowthEvent = vi.fn();
  const friendsApi = {
    getFriends: vi.fn().mockResolvedValue([]),
    getPendingRequests: vi.fn().mockResolvedValue([]),
    getOutgoingRequests: vi.fn().mockResolvedValue([]),
    getPendingChallenges: vi.fn().mockResolvedValue([]),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    declineFriendRequest: vi.fn(),
    cancelFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    getBlockedUsers: vi.fn().mockResolvedValue([]),
    searchUsers: vi.fn().mockResolvedValue([]),
    updateOnlineStatus: vi.fn().mockResolvedValue(undefined),
  };
  return { mockUseAuth, mockSocketCtx, fakeSocket, friendsApi, mockTrackGrowthEvent };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => mockSocketCtx() }));
vi.mock('@/utils/friends', () => friendsApi);
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => ({ current: true }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: mockTrackGrowthEvent }));

import { useFriends } from '../useFriends';

describe('useFriends — friend_added event tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    friendsApi.getFriends.mockResolvedValue([]);
    friendsApi.getPendingRequests.mockResolvedValue([]);
    friendsApi.getOutgoingRequests.mockResolvedValue([]);
    friendsApi.getPendingChallenges.mockResolvedValue([]);
  });

  it('fires trackGrowthEvent("friend_added") on successful acceptRequest', async () => {
    friendsApi.acceptFriendRequest.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.acceptRequest('request-id-123');

    await waitFor(() => {
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('friend_added');
    });
  });

  it('does NOT fire trackGrowthEvent on failed acceptRequest', async () => {
    friendsApi.acceptFriendRequest.mockResolvedValue({ success: false, error: 'Already accepted' });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.acceptRequest('request-id-456');

    await waitFor(() => {
      expect(friendsApi.acceptFriendRequest).toHaveBeenCalled();
    });

    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });
});
