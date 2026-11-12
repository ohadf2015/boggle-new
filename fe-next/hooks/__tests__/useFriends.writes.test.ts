import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, friendsApi, mockTrackGrowthEvent } = vi.hoisted(() => {
  const fakeSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn(), once: vi.fn() };
  // Stable identity: a fresh `user` object per render would re-trigger the fetch effect forever.
  const auth = { isAuthenticated: true, user: { id: 'user-a' } };
  return {
    fakeSocket,
    mockUseAuth: vi.fn(() => auth),
    mockSocketCtx: vi.fn((): { socket: unknown; isConnected: boolean } => ({ socket: fakeSocket, isConnected: true })),
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

describe('useFriends — writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    friendsApi.getFriends.mockResolvedValue([]);
    friendsApi.getPendingRequests.mockResolvedValue([]);
    friendsApi.getOutgoingRequests.mockResolvedValue([]);
    friendsApi.getPendingChallenges.mockResolvedValue([]);
    friendsApi.getBlockedUsers.mockResolvedValue([]);
    friendsApi.updateOnlineStatus.mockResolvedValue(undefined);
  });

  it.each([
    [true],
    [false],
  ])('Given the socket connected=%s, When sending a request, Then the server write runs (no socket emit)', async (connected) => {
    mockSocketCtx.mockReturnValue({ socket: fakeSocket, isConnected: connected });
    friendsApi.sendFriendRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.sendRequest('user-b'); });

    expect(friendsApi.sendFriendRequest).toHaveBeenCalledWith('user-b');
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('friends:sendRequest', expect.anything());
  });

  it('Given a policy rejection, When sending a request, Then it is returned and nothing refreshes', async () => {
    friendsApi.sendFriendRequest.mockResolvedValue({ success: false, code: 'SOCIAL_RESTRICTED', error: 'SOCIAL_RESTRICTED' });
    const { result } = await setup();
    friendsApi.getFriends.mockClear();

    let res: unknown;
    await act(async () => { res = await result.current.sendRequest('user-b'); });

    expect(res).toMatchObject({ success: false, code: 'SOCIAL_RESTRICTED' });
    expect(friendsApi.getFriends).not.toHaveBeenCalled();
  });

  it('Given an accept, Then friend_added is tracked', async () => {
    friendsApi.acceptFriendRequest.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.acceptRequest('req-1'); });

    expect(friendsApi.acceptFriendRequest).toHaveBeenCalledWith('req-1');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('friend_added');
  });

  it('Given block then unblock, Then both reach the server and the blocked list reloads', async () => {
    friendsApi.blockUser.mockResolvedValue({ success: true });
    friendsApi.unblockUser.mockResolvedValue({ success: true });
    const { result } = await setup();

    await act(async () => { await result.current.block('user-b'); });
    await act(async () => { await result.current.unblock('user-b'); });

    expect(friendsApi.blockUser).toHaveBeenCalledWith('user-b');
    expect(friendsApi.unblockUser).toHaveBeenCalledWith('user-b');
    expect(friendsApi.getBlockedUsers).toHaveBeenCalled();
  });
});
