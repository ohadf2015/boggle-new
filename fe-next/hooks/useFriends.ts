'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchUsers,
  type Friend,
  type FriendRequest,
  type FriendChallenge,
} from '@/utils/friends';
import { useSocketOptional } from '@/utils/SocketContext';
import logger from '@/utils/logger';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { loadFriendsSnapshot, pingOnlineStatus } from '@/hooks/friends/friendsSnapshot';

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
  // force: after a friend action or realtime event (always fresh). Routine
  // fetches share one snapshot across every mounted useFriends (see friendsSnapshot).
  const fetchAll = useCallback(async (force = false) => {
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
      const snapshot = await loadFriendsSnapshot(user.id, { force });
      const friends = [...snapshot.friends];
      const pending = snapshot.pendingRequests;
      const outgoing = snapshot.outgoingRequests;
      const challenges = snapshot.pendingChallenges;

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
    await fetchAll(true);
  }, [fetchAll]);

  const afterWrite = useCallback(async <T extends { success: boolean }>(result: T, onSuccess?: () => void) => {
    if (result.success) {
      onSuccess?.();
      await refresh();
    }
    return result;
  }, [refresh]);

  const sendRequest = useCallback(
    async (userId: string) => afterWrite(await sendFriendRequest(userId)),
    [afterWrite]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => afterWrite(await acceptFriendRequest(requestId), () => trackGrowthEvent('friend_added')),
    [afterWrite]
  );

  const declineRequest = useCallback(
    async (requestId: string) => afterWrite(await declineFriendRequest(requestId)),
    [afterWrite]
  );

  const cancelRequest = useCallback(
    async (requestId: string) => afterWrite(await cancelFriendRequest(requestId)),
    [afterWrite]
  );

  const unfriend = useCallback(
    async (friendUserId: string) => afterWrite(await removeFriend(friendUserId)),
    [afterWrite]
  );

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

  const block = useCallback(async (userId: string) => {
    const result = await afterWrite(await blockUser(userId));
    if (result.success) await refreshBlockedUsers();
    return result;
  }, [afterWrite, refreshBlockedUsers]);

  const unblock = useCallback(async (userId: string) => {
    const result = await unblockUser(userId);
    if (result.success) await refreshBlockedUsers();
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
      pingOnlineStatus(user?.id);
      onlineStatusIntervalRef.current = setInterval(() => {
        pingOnlineStatus(user?.id);
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

    const onRefresh = () => { fetchAll(true); };

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
