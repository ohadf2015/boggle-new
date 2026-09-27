/**
 * useFriends — refresh on challenge socket events (B2)
 *
 * Regression: useFriends listened only to friend-request events. An incoming
 * `friends:challengeReceived` would never trigger refetch — the actionable
 * Accept/Decline row only appeared after the next 30s poll, making the
 * feature feel broken from the recipient's side.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, registeredEvents, friendsApi } = vi.hoisted(() => {
  const registeredEvents = new Set<string>();
  const fakeSocket = {
    emit: vi.fn(),
    on: vi.fn((event: string) => { registeredEvents.add(event); }),
    off: vi.fn((event: string) => { registeredEvents.delete(event); }),
    once: vi.fn(),
  };
  const mockUseAuth = vi.fn(() => ({ isAuthenticated: true, user: { id: 'user-a' } }));
  const mockSocketCtx = vi.fn(() => ({ socket: fakeSocket, isConnected: true }));
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
  return { mockUseAuth, mockSocketCtx, fakeSocket, registeredEvents, friendsApi };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => mockSocketCtx() }));
vi.mock('@/utils/friends', () => friendsApi);
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => ({ current: true }) }));

import { useFriends } from '../useFriends';

describe('useFriends — challenge socket event listeners (B2)', () => {
  beforeEach(() => {
    registeredEvents.clear();
    fakeSocket.on.mockClear();
    fakeSocket.off.mockClear();
  });

  it.each([
    'friends:challengeReceived',
    'friends:challengeAccepted',
    'friends:challengeDeclined',
    'friends:challengeExpired',
  ])('registers a listener for %s when authenticated and connected', async (eventName) => {
    renderHook(() => useFriends());
    await waitFor(() => expect(registeredEvents.has(eventName)).toBe(true));
  });

  it('unregisters challenge listeners on unmount', async () => {
    const { unmount } = renderHook(() => useFriends());
    await waitFor(() => expect(registeredEvents.has('friends:challengeReceived')).toBe(true));
    unmount();
    expect(registeredEvents.has('friends:challengeReceived')).toBe(false);
    expect(registeredEvents.has('friends:challengeAccepted')).toBe(false);
    expect(registeredEvents.has('friends:challengeDeclined')).toBe(false);
    expect(registeredEvents.has('friends:challengeExpired')).toBe(false);
  });
});

void fakeSocket;
void friendsApi;
