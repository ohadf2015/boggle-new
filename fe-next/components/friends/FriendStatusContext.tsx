'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Friend } from '@/utils/friendsTypes';

/**
 * Viewer's relationship to another player, by user id.
 * - self: the viewer's own row
 * - friend: already friends
 * - sent: viewer sent a request that is still pending
 * - incoming: the other player sent the viewer a request
 * - none: no relationship yet
 */
export type FriendRelation = 'self' | 'friend' | 'sent' | 'incoming' | 'none';

export interface FriendStatusValue {
  isAuthenticated: boolean;
  /** Viewer may send/accept friend requests (Families Policy). */
  canManage: boolean;
  /** Viewer may open 1:1 chat (Families Policy). */
  canMessage: boolean;
  relationFor: (userId: string | null | undefined) => FriendRelation;
  friendFor: (userId: string) => Friend | undefined;
  onlineFriends: Friend[];
  sendTo: (userId: string, surface: string) => Promise<boolean>;
  acceptFrom: (userId: string, surface: string) => Promise<boolean>;
  /** Raw lists for legacy consumers (results badge). */
  friends: Friend[];
  outgoingUsernames: Set<string>;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

const FriendStatusContext = createContext<FriendStatusValue | null>(null);

/**
 * One friends snapshot shared by every row on a board. Rows read relations by
 * user id; useFriends (polling, socket) runs once per provider, not per row.
 */
export function FriendStatusProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { friends = [], outgoingRequests = [], pendingRequests = [], sendRequest, acceptRequest } = useFriends();
  const { caps } = useSocialCapabilities();
  // Optimistic: ids we sent to (or accepted) this session, so the row flips at once.
  const [sentIds, setSentIds] = useState<Set<string>>(() => new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());

  const myId = user?.id ?? null;
  const friendById = useMemo(() => new Map(friends.map((f) => [f.odUserId, f])), [friends]);
  const outgoingIds = useMemo(() => new Set(outgoingRequests.map((r) => r.fromUserId)), [outgoingRequests]);
  const incomingByUser = useMemo(() => new Map(pendingRequests.map((r) => [r.fromUserId, r])), [pendingRequests]);
  const outgoingUsernames = useMemo(
    () => new Set(outgoingRequests.map((r) => r.fromUsername.toLowerCase())),
    [outgoingRequests],
  );
  const onlineFriends = useMemo(() => friends.filter((f) => f.isOnline), [friends]);

  const relationFor = useCallback((userId: string | null | undefined): FriendRelation => {
    if (!userId) return 'none';
    if (myId && userId === myId) return 'self';
    if (friendById.has(userId) || acceptedIds.has(userId)) return 'friend';
    if (sentIds.has(userId) || outgoingIds.has(userId)) return 'sent';
    if (incomingByUser.has(userId)) return 'incoming';
    return 'none';
  }, [myId, friendById, acceptedIds, sentIds, outgoingIds, incomingByUser]);

  const friendFor = useCallback((userId: string) => friendById.get(userId), [friendById]);

  const sendTo = useCallback(async (userId: string, surface: string) => {
    const res = await sendRequest(userId);
    if (res.success) {
      setSentIds((prev) => new Set(prev).add(userId));
      trackGrowthEvent('friend_request_sent', { surface });
    }
    return res.success;
  }, [sendRequest]);

  const acceptFrom = useCallback(async (userId: string, surface: string) => {
    const req = incomingByUser.get(userId);
    if (!req) return false;
    const res = await acceptRequest(req.id);
    if (res.success) {
      setAcceptedIds((prev) => new Set(prev).add(userId));
      trackGrowthEvent('friend_request_accepted', { surface });
    }
    return res.success;
  }, [acceptRequest, incomingByUser]);

  const value = useMemo<FriendStatusValue>(() => ({
    isAuthenticated,
    canManage: isAuthenticated && caps.friendManagement,
    canMessage: isAuthenticated && caps.friendMessaging,
    relationFor,
    friendFor,
    onlineFriends,
    sendTo,
    acceptFrom,
    friends,
    outgoingUsernames,
    sendRequest,
  }), [isAuthenticated, caps.friendManagement, caps.friendMessaging, relationFor, friendFor, onlineFriends, sendTo, acceptFrom, friends, outgoingUsernames, sendRequest]);

  return <FriendStatusContext.Provider value={value}>{children}</FriendStatusContext.Provider>;
}

/** Null outside a FriendStatusProvider — callers render nothing then. */
export function useFriendStatus(): FriendStatusValue | null {
  return useContext(FriendStatusContext);
}
