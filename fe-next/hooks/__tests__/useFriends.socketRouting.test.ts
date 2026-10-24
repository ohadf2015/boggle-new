/**
 * useFriends — writes go through the socket when it is connected, so the server
 * can notify the other player, invalidate the friendship cache and apply the
 * Families Policy gate. The direct-DB path is only a fallback when the server
 * did not answer (or the socket is down).
 */
import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, friendsApi, mockSocketRequest, mockTrackGrowthEvent } = vi.hoisted(() => {
  const fakeSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn(), once: vi.fn() };
  // Stable identity: a fresh `user` object per render would re-trigger the fetch effect forever.
  const auth = { isAuthenticated: true, user: { id: 'user-a' } };
  return {
    fakeSocket,
    mockUseAuth: vi.fn(() => auth),
    mockSocketCtx: vi.fn((): { socket: unknown; isConnected: boolean } => ({ socket: fakeSocket, isConnected: true })),
    mockSocketRequest: vi.fn(),
    mockTrackGrowthEvent: vi.fn(),
    friendsApi: {
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
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => mockSocketCtx() }));
vi.mock('@/utils/friends', () => friendsApi);
vi.mock('@/utils/friendsSocketRequest', () => ({ friendsSocketRequest: mockSocketRequest }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
// Stable ref: a new object per render re-creates fetchAll and loops the fetch effect.
vi.mock('@/hooks/useMounted', () => {
  const mounted = { current: true };
  return { useMounted: () => mounted };
});
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: mockTrackGrowthEvent }));

import { useFriends } from '../useFriends';

async function setup() {
  const hook = renderHook(() => useFriends());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useFriends — socket-first writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    friendsApi.getFriends.mockResolvedValue([]);
    friendsApi.getPendingRequests.mockResolvedValue([]);
    friendsApi.getOutgoingRequests.mockResolvedValue([]);
    friendsApi.getPendingChallenges.mockResolvedValue([]);
    friendsApi.getBlockedUsers.mockResolvedValue([]);
    friendsApi.updateOnlineStatus.mockResolvedValue(undefined);
    mockSocketCtx.mockReturnValue({ socket: fakeSocket, isConnected: true });
  });

  it('sendRequest goes through friends:sendRequest and skips the direct write', async () => {
    mockSocketRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    let res: { success: boolean } | undefined;
    await act(async () => { res = await result.current.sendRequest('user-b'); });

    expect(mockSocketRequest).toHaveBeenCalledWith(
      fakeSocket, 'friends:sendRequest', { targetUserId: 'user-b' },
      expect.objectContaining({ successEvent: 'friends:requestSent', alsoSuccessOn: ['friends:requestAccepted'] })
    );
    expect(friendsApi.sendFriendRequest).not.toHaveBeenCalled();
    expect(res?.success).toBe(true);
  });

  it('sendRequest falls back to the direct write when the server did not answer', async () => {
    mockSocketRequest.mockResolvedValue({ success: false, fallback: true });
    friendsApi.sendFriendRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    let res: { success: boolean } | undefined;
    await act(async () => { res = await result.current.sendRequest('user-b'); });

    expect(friendsApi.sendFriendRequest).toHaveBeenCalledWith('user-b');
    expect(res?.success).toBe(true);
  });

  it('sendRequest does NOT fall back after a definitive server rejection (policy gate must hold)', async () => {
    mockSocketRequest.mockResolvedValue({ success: false, code: 'SOCIAL_RESTRICTED', error: 'Adding friends is turned off for this account' });
    const { result } = await setup();

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => { res = await result.current.sendRequest('user-b'); });

    expect(friendsApi.sendFriendRequest).not.toHaveBeenCalled();
    expect(res).toEqual({ success: false, error: 'Adding friends is turned off for this account' });
  });

  it('sendRequest uses the direct write when the socket is disconnected', async () => {
    mockSocketCtx.mockReturnValue({ socket: fakeSocket, isConnected: false });
    friendsApi.sendFriendRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.sendRequest('user-b'); });

    expect(mockSocketRequest).not.toHaveBeenCalled();
    expect(friendsApi.sendFriendRequest).toHaveBeenCalledWith('user-b');
  });

  it('acceptRequest goes through the socket and still tracks friend_added', async () => {
    mockSocketRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.acceptRequest('req-1'); });

    expect(mockSocketRequest).toHaveBeenCalledWith(
      fakeSocket, 'friends:acceptRequest', { requestId: 'req-1' },
      expect.objectContaining({ successEvent: 'friends:requestAccepted' })
    );
    expect(friendsApi.acceptFriendRequest).not.toHaveBeenCalled();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('friend_added');
  });

  it('acceptRequest falls back to the direct write on timeout', async () => {
    mockSocketRequest.mockResolvedValue({ success: false, fallback: true });
    friendsApi.acceptFriendRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.acceptRequest('req-1'); });

    expect(friendsApi.acceptFriendRequest).toHaveBeenCalledWith('req-1');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('friend_added');
  });

  it('block / unblock go through the socket (server invalidates the friendship cache)', async () => {
    mockSocketRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.block('user-b'); });
    await act(async () => { await result.current.unblock('user-b'); });

    expect(mockSocketRequest).toHaveBeenCalledWith(
      fakeSocket, 'friends:block', { targetUserId: 'user-b' }, expect.objectContaining({ successEvent: 'friends:blocked' })
    );
    expect(mockSocketRequest).toHaveBeenCalledWith(
      fakeSocket, 'friends:unblock', { targetUserId: 'user-b' }, expect.objectContaining({ successEvent: 'friends:unblocked' })
    );
    expect(friendsApi.blockUser).not.toHaveBeenCalled();
    expect(friendsApi.unblockUser).not.toHaveBeenCalled();
  });

  it('unfriend reports failure when the server rejects instead of claiming success', async () => {
    mockSocketRequest.mockResolvedValue({ success: false, code: 'SERVER_ERROR', error: 'Failed to unfriend user' });
    const { result } = await setup();

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => { res = await result.current.unfriend('user-b'); });

    expect(res).toEqual({ success: false, error: 'Failed to unfriend user' });
    expect(friendsApi.removeFriend).not.toHaveBeenCalled();
  });

  it('unfriend falls back to the direct delete when the server never answers', async () => {
    mockSocketRequest.mockResolvedValue({ success: false, fallback: true });
    friendsApi.removeFriend.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.unfriend('user-b'); });

    expect(friendsApi.removeFriend).toHaveBeenCalledWith('user-b');
  });
});
