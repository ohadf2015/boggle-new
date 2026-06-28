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

  // Send friend request
  const sendRequest = useCallback(async (userId: string) => {
    const result = await sendFriendRequest(userId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      trackGrowthEvent('friend_added');
      await refresh();
    }
    return result;
  }, [refresh]);

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

  // Unfriend — prefer Socket.IO to trigger server-side Redis cache invalidation (F-4)
  const unfriend = useCallback(async (friendUserId: string) => {
    if (socket && isSocketConnected) {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          refresh();
          resolve({ success: true });
        };
        socket.emit('friends:unfriend', { friendUserId });
        socket.once('friends:friendRemoved', done);
        // Timeout fallback — only fires if socket event didn't arrive
        setTimeout(done, 3000);
      });
    }
    const result = await removeFriend(friendUserId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh, socket, isSocketConnected]);

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
    const result = await blockUser(userId);
    if (result.success) {
      await refresh();
      await refreshBlockedUsers();
    }
    return result;
  }, [refresh, refreshBlockedUsers]);

  // Unblock user
  const unblock = useCallback(async (userId: string) => {
    const result = await unblockUser(userId);
    if (result.success) {
      await refreshBlockedUsers();
    }
    return result;
  }, [refreshBlockedUsers]);

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
