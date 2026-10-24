'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  getFriends,
  getPendingRequests,
  getOutgoingRequests,
  getPendingChallenges,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchUsers,
  updateOnlineStatus,
  type Friend,
  type FriendRequest,
  type FriendChallenge,
} from '@/utils/friends';
import { useSocketOptional } from '@/utils/SocketContext';
import { friendsSocketRequest, type FriendsSocketResult } from '@/utils/friendsSocketRequest';
import logger from '@/utils/logger';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface UseFriendsState {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  pendingChallenges: FriendChallenge[];
  isLoading: boolean;
  error: string | null;
}

interface UseFriendsActions {
  refresh: () => Promise<void>;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  declineRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  unfriend: (friendUserId: string) => Promise<{ success: boolean; error?: string }>;
  block: (userId: string) => Promise<{ success: boolean; error?: string }>;
  unblock: (userId: string) => Promise<{ success: boolean; error?: string }>;
  blockedUsers: Friend[];
  refreshBlockedUsers: () => Promise<void>;
  search: (query: string) => Promise<Friend[]>;
}

export type UseFriendsReturn = UseFriendsState & UseFriendsActions;

// Update online status every 2 minutes
const ONLINE_STATUS_INTERVAL = 2 * 60 * 1000;

// Refresh friend list every 30 seconds when visible
const FRIEND_LIST_REFRESH_INTERVAL = 30 * 1000;

/**
 * Hook for managing friend relationships
 *
 * Provides:
 * - Friend list with online status
 * - Pending incoming/outgoing requests
 * - Pending direct challenges
 * - Actions: send/accept/decline requests, unfriend, block
 */
export function useFriends(): UseFriendsReturn {
  const { isAuthenticated, user } = useAuth();
  const socketContext = useSocketOptional();
  const socket = socketContext?.socket ?? null;
  const isSocketConnected = socketContext?.isConnected ?? false;

  const [state, setState] = useState<UseFriendsState>({
    friends: [],
    pendingRequests: [],
    outgoingRequests: [],
    pendingChallenges: [],
    isLoading: true,
    error: null,
  });

  const isMounted = useMounted();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onlineStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all friend data
  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        friends: [],
        pendingRequests: [],
        outgoingRequests: [],
        pendingChallenges: [],
        isLoading: false,
      }));
      return;
    }

    try {
      // Pass the already-resolved user id so each util skips its own auth.getUser() round-trip (50–200ms each).
      const [friends, pending, outgoing, challenges] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
        getOutgoingRequests(user.id),
        getPendingChallenges(user.id),
      ]);

      if (isMounted.current) {
        setState({
          friends: friends.sort((a, b) => {
            // Online friends first
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            // Then alphabetically
            return a.username.localeCompare(b.username);
          }),
          pendingRequests: pending,
          outgoingRequests: outgoing,
          pendingChallenges: challenges,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.debug('Error fetching friends:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load friends',
        }));
      }
    }
  }, [isAuthenticated, user, isMounted]);

  // Refresh friend data
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  /**
   * Run a friend write through the socket when connected (server-side push/live
   * notification, cache invalidation, Families Policy gate). Only when the server
   * did not answer — or the socket is down — does the direct-DB `fallback` run.
   * A definitive server rejection is returned as-is and never retried directly.
   */
  const viaSocket = useCallback(async (
    run: () => Promise<FriendsSocketResult> | null,
    fallback: () => Promise<{ success: boolean; error?: string }>
  ): Promise<{ success: boolean; error?: string }> => {
    const pending = socket && isSocketConnected ? run() : null;
    if (pending) {
      const res = await pending;
      if (!res.fallback) {
        return res.success ? { success: true } : { success: false, error: res.error || 'Request failed' };
      }
    }
    return fallback();
  }, [socket, isSocketConnected]);

  // Send friend request
  const sendRequest = useCallback(async (userId: string) => {
    const result = await viaSocket(
      () => friendsSocketRequest(socket!, 'friends:sendRequest', { targetUserId: userId }, {
        successEvent: 'friends:requestSent',
        alsoSuccessOn: ['friends:requestAccepted'],
      }),
      () => sendFriendRequest(userId)
    );
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh, viaSocket, socket]);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: string) => {
    const result = await viaSocket(
      () => friendsSocketRequest(socket!, 'friends:acceptRequest', { requestId }, {
        successEvent: 'friends:requestAccepted',
        match: (d) => (d as { requestId?: string })?.requestId === requestId,
      }),
      () => acceptFriendRequest(requestId)
    );
    if (result.success) {
      trackGrowthEvent('friend_added');
      await refresh();
    }
    return result;
  }, [refresh, viaSocket, socket]);

  // Decline friend request
  const declineRequest = useCallback(async (requestId: string) => {
    const result = await declineFriendRequest(requestId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Cancel outgoing request
  const cancelRequest = useCallback(async (requestId: string) => {
    const result = await cancelFriendRequest(requestId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Unfriend — via the socket so the server invalidates the friendship cache (F-4) and
  // tells the other side; a rejection is reported, not swallowed as success.
  const unfriend = useCallback(async (friendUserId: string) => {
    const result = await viaSocket(
      () => friendsSocketRequest(socket!, 'friends:unfriend', { friendUserId }, {
        successEvent: 'friends:friendRemoved',
        match: (d) => (d as { friendUserId?: string })?.friendUserId === friendUserId,
      }),
      () => removeFriend(friendUserId)
    );
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh, viaSocket, socket]);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);

  const refreshBlockedUsers = useCallback(async () => {
    if (!isAuthenticated) {
      setBlockedUsers([]);
      return;
    }
    try {
      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);
    } catch {
      // Silent fail
    }
  }, [isAuthenticated]);

  // Block user
  const block = useCallback(async (userId: string) => {
    const result = await viaSocket(
      () => friendsSocketRequest(socket!, 'friends:block', { targetUserId: userId }, {
        successEvent: 'friends:blocked',
        match: (d) => (d as { targetUserId?: string })?.targetUserId === userId,
      }),
      () => blockUser(userId)
    );
    if (result.success) {
      await refresh();
      await refreshBlockedUsers();
    }
    return result;
  }, [refresh, refreshBlockedUsers, viaSocket, socket]);

  // Unblock user
  const unblock = useCallback(async (userId: string) => {
    const result = await viaSocket(
      () => friendsSocketRequest(socket!, 'friends:unblock', { targetUserId: userId }, {
        successEvent: 'friends:unblocked',
        match: (d) => (d as { targetUserId?: string })?.targetUserId === userId,
      }),
      () => unblockUser(userId)
    );
    if (result.success) {
      await refreshBlockedUsers();
    }
    return result;
  }, [refreshBlockedUsers, viaSocket, socket]);

  // Search for users
  const search = useCallback(async (query: string): Promise<Friend[]> => {
    if (query.length < 2) return [];
    return searchUsers(query);
  }, []);

  // Initial fetch and setup intervals
  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();

      // Update online status periodically (pass user id to skip auth.getUser() round-trips)
      updateOnlineStatus(user?.id);
      onlineStatusIntervalRef.current = setInterval(() => {
        updateOnlineStatus(user?.id);
      }, ONLINE_STATUS_INTERVAL);

      // Refresh friend list periodically (only when document is visible)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchAll();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      refreshIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAll();
        }
      }, FRIEND_LIST_REFRESH_INTERVAL);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        if (onlineStatusIntervalRef.current) {
          clearInterval(onlineStatusIntervalRef.current);
        }
      };
    } else {
      setState(prev => ({
        ...prev,
        friends: [],
        pendingRequests: [],
        outgoingRequests: [],
        pendingChallenges: [],
        isLoading: false,
      }));
      return undefined;
    }
  }, [isAuthenticated, fetchAll, user?.id]);

  // Realtime friend events — refresh on incoming/accepted/declined/removed
  useEffect(() => {
    if (!isAuthenticated || !socket || !isSocketConnected) return;

    const onRefresh = () => { fetchAll(); };

    socket.on('friends:requestReceived', onRefresh);
    socket.on('friends:requestAccepted', onRefresh);
    socket.on('friends:requestDeclined', onRefresh);
    socket.on('friends:requestSent', onRefresh);
    socket.on('friends:friendRemoved', onRefresh);
    // Challenge events — without these, the rendered pendingChallenges list
    // stays stale until the next 30s poll.
    socket.on('friends:challengeReceived', onRefresh);
    socket.on('friends:challengeAccepted', onRefresh);
    socket.on('friends:challengeDeclined', onRefresh);
    socket.on('friends:challengeExpired', onRefresh);
    socket.on('friends:challengeResult', onRefresh);

    return () => {
      socket.off('friends:requestReceived', onRefresh);
      socket.off('friends:requestAccepted', onRefresh);
      socket.off('friends:requestDeclined', onRefresh);
      socket.off('friends:requestSent', onRefresh);
      socket.off('friends:friendRemoved', onRefresh);
      socket.off('friends:challengeReceived', onRefresh);
      socket.off('friends:challengeAccepted', onRefresh);
      socket.off('friends:challengeDeclined', onRefresh);
      socket.off('friends:challengeExpired', onRefresh);
      socket.off('friends:challengeResult', onRefresh);
    };
  }, [isAuthenticated, socket, isSocketConnected, fetchAll]);

  return {
    ...state,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    block,
    unblock,
    blockedUsers,
    refreshBlockedUsers,
    search,
  };
}

export default useFriends;
