/**
 * Friends Client Utilities
 * Friend relationship operations (send, accept, decline, remove, block, list)
 *
 * Types: ./friendsTypes.ts
 * Head-to-head, challenges, search, online: ./friendsHeadToHead.ts
 */

import { createClient } from '@/utils/supabase/client';
import logger from '@/utils/logger';
import {
  isUserOnline,
  type FriendStatus,
  type FriendshipRow,
  type ProfileRow,
  type Friend,
  type FriendRequest,
} from './friendsTypes';

// Re-export all types for backward compatibility
export type {
  FriendStatus,
  FriendRecord,
  Friend,
  FriendRequest,
  HeadToHeadRow,
  ChallengeRow,
  HeadToHeadRecord,
  FriendChallenge,
} from './friendsTypes';

// Re-export all functions from extracted modules
export {
  searchUsers,
  getHeadToHead,
  getAllHeadToHead,
  sendDirectChallenge,
  getPendingChallenges,
  updateOnlineStatus,
  getUserByUsername,
} from './friendsHeadToHead';

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: existing } = await supabase
    .from('friends')
    .select('id, status')
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
    .single();

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'Already friends' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'Request already pending' };
    }
    if (existing.status === 'blocked') {
      return { success: false, error: 'Unable to send request' };
    }
  }

  const { error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'pending',
    });

  if (error) {
    logger.error('Error sending friend request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) {
    logger.error('Error accepting friend request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', requestId)
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) {
    logger.error('Error declining friend request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a friend (unfriend)
 */
export async function removeFriend(friendUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`);

  if (error) {
    logger.error('Error removing friend:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Block a user
 */
export async function blockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);

  const { error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'blocked',
    });

  if (error) {
    logger.error('Error blocking user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Unblock a user (removes the blocked relationship)
 */
export async function unblockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', user.id)
    .eq('friend_id', targetUserId)
    .eq('status', 'blocked');

  if (error) {
    logger.error('Error unblocking user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get users blocked by the current user
 */
export async function getBlockedUsers(): Promise<Friend[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: blocked, error } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', user.id)
    .eq('status', 'blocked');

  if (error || !blocked || blocked.length === 0) return [];

  const blockedIds = blocked.map((b: { friend_id: string }) => b.friend_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color, avatar_config')
    .in('id', blockedIds);

  if (!profiles) return [];

  return profiles.map((p: ProfileRow) => ({
    id: p.id,
    odUserId: p.id,
    username: p.username || 'Unknown',
    displayName: p.display_name || p.username || 'Unknown',
    avatarImage: p.avatar_image || undefined,
    customAvatar: p.avatar_config || undefined,
    isOnline: false,
    totalGames: 0,
  })) as Friend[];
}

/**
 * Get all accepted friends for the current user
 */
export async function getFriends(userId?: string): Promise<Friend[]> {
  const supabase = createClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  const { data: friendships, error } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at,
      updated_at
    `)
    .eq('status', 'accepted')
    .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

  if (error || !friendships) {
    logger.debug('Error fetching friends:', error);
    return [];
  }

  const friendIds = (friendships as FriendshipRow[]).map((f: FriendshipRow) =>
    f.user_id === uid ? f.friend_id : f.user_id
  );

  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color, avatar_config, total_games, ranked_mmr, current_level, last_seen_at')
    .in('id', friendIds);

  if (profileError || !profiles) {
    logger.error('Error fetching friend profiles:', profileError);
    return [];
  }

  const typedFriendships = friendships as FriendshipRow[];
  return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
    id: typedFriendships.find((f: FriendshipRow) => f.user_id === p.id || f.friend_id === p.id)?.id || '',
    odUserId: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarImage: p.avatar_image,
    avatarEmoji: p.avatar_emoji || '😊',
    avatarColor: p.avatar_color || '#4F46E5',
    customAvatar: p.avatar_config as Friend['customAvatar'],
    status: 'accepted' as FriendStatus,
    isOnline: isUserOnline(p.last_seen_at),
    lastSeenAt: p.last_seen_at,
    totalGames: p.total_games,
    rankedMmr: p.ranked_mmr,
    currentLevel: p.current_level,
  }));
}

/**
 * Get pending friend requests (incoming)
 */
export async function getPendingRequests(userId?: string): Promise<FriendRequest[]> {
  const supabase = createClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  const { data: requests, error } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      created_at,
      profiles!friends_user_id_fkey (
        username,
        display_name,
        avatar_image,
        avatar_emoji,
        avatar_color,
        avatar_config
      )
    `)
    .eq('friend_id', uid)
    .eq('status', 'pending');

  if (error || !requests) {
    logger.error('Error fetching pending requests:', error);
    return [];
  }

  interface RequestWithProfile {
    id: string;
    user_id: string;
    created_at: string;
    profiles: Array<{
      username: string;
      display_name?: string;
      avatar_image?: string;
      avatar_emoji?: string;
      avatar_color?: string;
      avatar_config?: Record<string, unknown>;
    }>;
  }
  return (requests as unknown as RequestWithProfile[]).map((r: RequestWithProfile) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      fromUserId: r.user_id,
      fromUsername: profile?.username || 'Unknown',
      fromDisplayName: profile?.display_name,
      fromAvatarImage: profile?.avatar_image,
      fromAvatarEmoji: profile?.avatar_emoji || '😊',
      fromAvatarColor: profile?.avatar_color || '#4F46E5',
      fromCustomAvatar: profile?.avatar_config as FriendRequest['fromCustomAvatar'],
      createdAt: r.created_at,
    };
  });
}

/**
 * Cancel an outgoing friend request (sent by current user)
 */
export async function cancelFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', requestId)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    logger.error('Error cancelling friend request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get outgoing friend requests (sent by current user, still pending)
 */
export async function getOutgoingRequests(userId?: string): Promise<FriendRequest[]> {
  const supabase = createClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  const { data: requests, error } = await supabase
    .from('friends')
    .select(`
      id,
      friend_id,
      created_at,
      profiles!friends_friend_id_fkey (
        username,
        display_name,
        avatar_image,
        avatar_emoji,
        avatar_color,
        avatar_config
      )
    `)
    .eq('user_id', uid)
    .eq('status', 'pending');

  if (error || !requests) {
    logger.error('Error fetching outgoing requests:', error);
    return [];
  }

  interface OutgoingRequestWithProfile {
    id: string;
    friend_id: string;
    created_at: string;
    profiles: Array<{
      username: string;
      display_name?: string;
      avatar_image?: string;
      avatar_emoji?: string;
      avatar_color?: string;
      avatar_config?: Record<string, unknown>;
    }>;
  }
  return (requests as unknown as OutgoingRequestWithProfile[]).map((r: OutgoingRequestWithProfile) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      fromUserId: r.friend_id,
      fromUsername: profile?.username || 'Unknown',
      fromDisplayName: profile?.display_name,
      fromAvatarImage: profile?.avatar_image,
      fromAvatarEmoji: profile?.avatar_emoji || '😊',
      fromAvatarColor: profile?.avatar_color || '#4F46E5',
      fromCustomAvatar: profile?.avatar_config as FriendRequest['fromCustomAvatar'],
      createdAt: r.created_at,
    };
  });
}
