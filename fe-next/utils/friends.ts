/**
 * Friends Client Utilities
 * Friend relationship operations (send, accept, decline, remove, block, list)
 *
 * Types: ./friendsTypes.ts
 * Head-to-head, challenges, search, online: ./friendsHeadToHead.ts
 */

import { loadSupabaseClient } from '@/utils/supabase/loadClient';
import logger from '@/utils/logger';
import { postWithAuth } from '@/utils/authFetch';
import {
  fetchPublicProfiles,
  PUBLIC_PROFILES_TABLE,
  PUBLIC_PROFILE_COLUMNS,
} from './publicProfiles';
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

type FriendWriteResult = { success: boolean; error?: string; code?: string };

/** Every friendship write goes through the server: it applies the Families gate, notifies the other player and clears the cache. */
async function friendAction(action: 'request' | 'accept' | 'unfriend' | 'block' | 'unblock', target: string): Promise<FriendWriteResult> {
  try {
    const res = await postWithAuth('/api/friends/action', { action, target }, { requireSession: true });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; code?: string };
    if (res.ok && body.success) return { success: true };
    const code = body.code ?? `HTTP_${res.status}`;
    return { success: false, code, error: code };
  } catch (err) {
    logger.error(`Friend ${action} failed:`, err);
    return { success: false, code: 'NETWORK', error: 'NETWORK' };
  }
}

export const sendFriendRequest = (targetUserId: string) => friendAction('request', targetUserId);
export const acceptFriendRequest = (requestId: string) => friendAction('accept', requestId);
export const removeFriend = (friendUserId: string) => friendAction('unfriend', friendUserId);
export const blockUser = (targetUserId: string) => friendAction('block', targetUserId);
export const unblockUser = (targetUserId: string) => friendAction('unblock', targetUserId);

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await loadSupabaseClient();

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
 * Get users blocked by the current user
 */
export async function getBlockedUsers(): Promise<Friend[]> {
  const supabase = await loadSupabaseClient();

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
    .from(PUBLIC_PROFILES_TABLE)
    .select(PUBLIC_PROFILE_COLUMNS)
    .in('id', blockedIds);

  if (!profiles) return [];

  return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
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
  const supabase = await loadSupabaseClient();

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
    .from(PUBLIC_PROFILES_TABLE)
    .select(PUBLIC_PROFILE_COLUMNS)
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
  const supabase = await loadSupabaseClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  // Two round-trips, not a PostgREST embed: an embed resolves through a foreign
  // key, and the sender's name now comes from the `public_profiles` VIEW, which
  // has none. See ./publicProfiles.ts for why `profiles` can't be read directly.
  const { data: requests, error } = await supabase
    .from('friends')
    .select('id, user_id, created_at')
    .eq('friend_id', uid)
    .eq('status', 'pending');

  if (error || !requests) {
    logger.error('Error fetching pending requests:', error);
    return [];
  }

  interface RequestRow {
    id: string;
    user_id: string;
    created_at: string;
  }
  const rows = requests as RequestRow[];
  const profiles = await fetchPublicProfiles(supabase, rows.map((r) => r.user_id));

  return rows.map((r: RequestRow) => {
    const profile = profiles.get(r.user_id);
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
  const supabase = await loadSupabaseClient();

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
  const supabase = await loadSupabaseClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  // Two round-trips rather than an embed — same reason as getPendingRequests.
  const { data: requests, error } = await supabase
    .from('friends')
    .select('id, friend_id, created_at')
    .eq('user_id', uid)
    .eq('status', 'pending');

  if (error || !requests) {
    logger.error('Error fetching outgoing requests:', error);
    return [];
  }

  interface OutgoingRequestRow {
    id: string;
    friend_id: string;
    created_at: string;
  }
  const rows = requests as OutgoingRequestRow[];
  const profiles = await fetchPublicProfiles(supabase, rows.map((r) => r.friend_id));

  return rows.map((r: OutgoingRequestRow) => {
    const profile = profiles.get(r.friend_id);
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
