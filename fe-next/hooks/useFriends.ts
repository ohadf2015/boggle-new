'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFriends,
  getPendingRequests,
  getOutgoingRequests,
  getPendingChallenges,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  blockUser,
  searchUsers,
  updateOnlineStatus,
  type Friend,
  type FriendRequest,
  type FriendChallenge,
} from '@/utils/friends';
import logger from '@/utils/logger';

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
  unfriend: (friendUserId: string) => Promise<{ success: boolean; error?: string }>;
  block: (userId: string) => Promise<{ success: boolean; error?: string }>;
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

  const [state, setState] = useState<UseFriendsState>({
    friends: [],
    pendingRequests: [],
    outgoingRequests: [],
    pendingChallenges: [],
    isLoading: true,
    error: null,
  });

  const isMounted = useRef(true);
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
      const [friends, pending, outgoing, challenges] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getOutgoingRequests(),
        getPendingChallenges(),
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
      logger.error('Error fetching friends:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load friends',
        }));
      }
    }
  }, [isAuthenticated, user]);

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

  // Unfriend
  const unfriend = useCallback(async (friendUserId: string) => {
    const result = await removeFriend(friendUserId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Block user
  const block = useCallback(async (userId: string) => {
    const result = await blockUser(userId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Search for users
  const search = useCallback(async (query: string): Promise<Friend[]> => {
    if (query.length < 2) return [];
    return searchUsers(query);
  }, []);

  // Initial fetch and setup intervals
  useEffect(() => {
    isMounted.current = true;

    if (isAuthenticated) {
      fetchAll();

      // Update online status periodically
      updateOnlineStatus();
      onlineStatusIntervalRef.current = setInterval(() => {
        updateOnlineStatus();
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
        isMounted.current = false;
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
    }

    return () => {
      isMounted.current = false;
    };
  }, [isAuthenticated, fetchAll]);

  return {
    ...state,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest,
    unfriend,
    block,
    search,
  };
}

export default useFriends;
