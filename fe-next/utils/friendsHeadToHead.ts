/**
 * Friends Head-to-Head & Challenges
 * Head-to-head records, direct challenges, search, and online status
 */

import { createClient } from '@/utils/supabase/client';
import logger from '@/utils/logger';
import { shouldWriteOnlineStatus } from './onlineStatusThrottle';
import { PUBLIC_PROFILES_TABLE, PUBLIC_PROFILE_COLUMNS } from './publicProfiles';
import {
  isUserOnline,
  type FriendStatus,
  type Friend,
  type ProfileRow,
  type HeadToHeadRecord,
  type FriendChallenge,
} from './friendsTypes';

/**
 * Search for users to add as friends
 */
export async function searchUsers(query: string, limit: number = 10): Promise<Friend[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || query.length < 2) return [];

  const { data: profiles, error } = await supabase
    .from(PUBLIC_PROFILES_TABLE)
    .select(PUBLIC_PROFILE_COLUMNS)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', user.id)
    .limit(limit);

  if (error || !profiles) {
    logger.error('Error searching users:', error);
    return [];
  }

  const { data: existing } = await supabase
    .from('friends')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  interface ExistingRelation {
    user_id: string;
    friend_id: string;
    status: FriendStatus;
  }
  const existingMap = new Map<string, FriendStatus>();
  (existing as ExistingRelation[] | null)?.forEach((e: ExistingRelation) => {
    const otherId = e.user_id === user.id ? e.friend_id : e.user_id;
    existingMap.set(otherId, e.status);
  });

  return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
    id: p.id,
    odUserId: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarImage: p.avatar_image,
    avatarEmoji: p.avatar_emoji || '😊',
    avatarColor: p.avatar_color || '#4F46E5',
    customAvatar: p.avatar_config as Friend['customAvatar'],
    status: existingMap.get(p.id) || ('none' as FriendStatus),
    isOnline: isUserOnline(p.last_seen_at),
    lastSeenAt: p.last_seen_at,
    totalGames: p.total_games,
    currentLevel: p.current_level,
  }));
}

/**
 * Get head-to-head record with a specific player
 */
export async function getHeadToHead(opponentId: string): Promise<HeadToHeadRecord | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [player1Id, player2Id] = user.id < opponentId
    ? [user.id, opponentId]
    : [opponentId, user.id];
  const isPlayer1 = user.id === player1Id;

  const { data: h2h, error } = await supabase
    .from('head_to_head')
    .select('*')
    .eq('player1_id', player1Id)
    .eq('player2_id', player2Id)
    .single();

  if (error || !h2h) {
    return null;
  }

  const { data: opponent } = await supabase
    .from(PUBLIC_PROFILES_TABLE)
    .select('username, avatar_emoji, avatar_color')
    .eq('id', opponentId)
    .single();

  return {
    id: h2h.id,
    opponentId,
    opponentUsername: opponent?.username || 'Unknown',
    opponentAvatarEmoji: opponent?.avatar_emoji || '😊',
    opponentAvatarColor: opponent?.avatar_color || '#4F46E5',
    myWins: isPlayer1 ? h2h.player1_wins : h2h.player2_wins,
    theirWins: isPlayer1 ? h2h.player2_wins : h2h.player1_wins,
    draws: h2h.draws,
    totalGames: h2h.total_games,
    myTotalScore: isPlayer1 ? h2h.player1_total_score : h2h.player2_total_score,
    theirTotalScore: isPlayer1 ? h2h.player2_total_score : h2h.player1_total_score,
    lastGameAt: h2h.last_game_at,
  };
}

/**
 * Get all head-to-head records for current user
 */
export async function getAllHeadToHead(): Promise<HeadToHeadRecord[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: records, error } = await supabase
    .from('head_to_head')
    .select('*')
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order('last_game_at', { ascending: false });

  if (error || !records) {
    logger.error('Error fetching head-to-head records:', error);
    return [];
  }

  interface H2HRecord {
    id: string;
    player1_id: string;
    player2_id: string;
    player1_wins: number;
    player2_wins: number;
    draws: number;
    total_games: number;
    player1_total_score: number;
    player2_total_score: number;
    last_game_at?: string;
  }
  interface OpponentProfile {
    id: string;
    username: string;
    avatar_emoji?: string;
    avatar_color?: string;
  }

  const typedRecords = records as H2HRecord[];
  const opponentIds = typedRecords.map((r: H2HRecord) =>
    r.player1_id === user.id ? r.player2_id : r.player1_id
  );

  if (opponentIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from(PUBLIC_PROFILES_TABLE)
    .select('id, username, avatar_emoji, avatar_color')
    .in('id', opponentIds);

  const typedProfiles = (profiles || []) as OpponentProfile[];
  const profileMap = new Map(typedProfiles.map((p: OpponentProfile) => [p.id, p]));

  return typedRecords.map((r: H2HRecord) => {
    const isPlayer1 = r.player1_id === user.id;
    const opId = isPlayer1 ? r.player2_id : r.player1_id;
    const opponent = profileMap.get(opId);

    return {
      id: r.id,
      opponentId: opId,
      opponentUsername: opponent?.username || 'Unknown',
      opponentAvatarEmoji: opponent?.avatar_emoji || '😊',
      opponentAvatarColor: opponent?.avatar_color || '#4F46E5',
      myWins: isPlayer1 ? r.player1_wins : r.player2_wins,
      theirWins: isPlayer1 ? r.player2_wins : r.player1_wins,
      draws: r.draws,
      totalGames: r.total_games,
      myTotalScore: isPlayer1 ? r.player1_total_score : r.player2_total_score,
      theirTotalScore: isPlayer1 ? r.player2_total_score : r.player1_total_score,
      lastGameAt: r.last_game_at,
    };
  });
}

/**
 * Send a direct challenge to a friend
 */
export async function sendDirectChallenge(
  friendId: string,
  challengeId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('friend_challenges')
    .insert({
      challenger_id: user.id,
      challenged_id: friendId,
      challenge_id: challengeId,
      message,
      status: 'pending',
    });

  if (error) {
    logger.error('Error sending direct challenge:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get pending direct challenges (incoming)
 */
export async function getPendingChallenges(userId?: string): Promise<FriendChallenge[]> {
  const supabase = createClient();

  // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  const { data: challenges, error } = await supabase
    .from('friend_challenges')
    .select(`
      id,
      challenger_id,
      challenge_id,
      message,
      status,
      created_at,
      profiles!friend_challenges_challenger_id_fkey (
        username,
        display_name,
        avatar_emoji,
        avatar_color
      )
    `)
    .eq('challenged_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !challenges) {
    logger.error('Error fetching pending challenges:', error);
    return [];
  }

  interface ChallengeWithRelations {
    id: string;
    challenger_id: string;
    challenge_id: string;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed';
    created_at: string;
    // PostgREST returns a forward (many-to-one) FK embed as a single object, not an array.
    profiles: {
      username: string;
      display_name?: string | null;
      avatar_emoji?: string;
      avatar_color?: string;
    } | null;
  }
  return (challenges as unknown as ChallengeWithRelations[]).map((c: ChallengeWithRelations) => {
    const challenger = c.profiles;
    return {
      id: c.id,
      challengerId: c.challenger_id,
      challengerUsername: challenger?.username || 'Unknown',
      challengerDisplayName: challenger?.display_name ?? undefined,
      challengerAvatarEmoji: challenger?.avatar_emoji || '😊',
      challengerAvatarColor: challenger?.avatar_color || '#4F46E5',
      challengeId: c.challenge_id,
      challengeCode: c.challenge_id,
      message: c.message,
      status: c.status,
      createdAt: c.created_at,
    };
  });
}

// Module-level last-write timestamp shared across every useFriends instance, so
// N concurrent mounts collapse to one profiles UPDATE per throttle window.
let lastOnlineStatusWrite = 0;

/**
 * Update online status (call periodically while user is active).
 *
 * Throttled at the module level: multiple always-mounted components each run
 * their own interval, so without this guard one user emits several identical
 * profiles UPDATEs per cycle (and an auth.getUser round-trip each). We commit
 * the timestamp BEFORE the awaits so simultaneous callers can't both pass the
 * gate. Safe because the window is far under the 5-minute online threshold.
 */
export async function updateOnlineStatus(userId?: string): Promise<void> {
  const now = Date.now();
  if (!shouldWriteOnlineStatus(now, lastOnlineStatusWrite)) return;
  lastOnlineStatusWrite = now;

  const supabase = createClient();

  // Best-effort: a stale last_seen is harmless, but an unhandled rejection here
  // (transient network / RLS / an incomplete client) crashes the fire-and-forget
  // caller. Swallow + release the gate so the next cycle retries.
  try {
    // Reuse the caller's user id when available — avoids a redundant auth.getUser() round-trip (50–200ms).
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) {
      // Not actually authed — release the gate so a real session isn't blocked.
      lastOnlineStatusWrite = 0;
      return;
    }

    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', uid);
  } catch (err) {
    lastOnlineStatusWrite = 0;
    logger.warn('updateOnlineStatus: best-effort write failed', (err as Error)?.message);
  }
}

/**
 * Get friend by username
 */
export async function getUserByUsername(username: string): Promise<Friend | null> {
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from(PUBLIC_PROFILES_TABLE)
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', username)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id,
    odUserId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarImage: profile.avatar_image,
    avatarEmoji: profile.avatar_emoji || '😊',
    avatarColor: profile.avatar_color || '#4F46E5',
    customAvatar: profile.avatar_config as Friend['customAvatar'],
    status: 'none' as FriendStatus,
    isOnline: isUserOnline(profile.last_seen_at),
    lastSeenAt: profile.last_seen_at,
    totalGames: profile.total_games,
    currentLevel: profile.current_level,
  };
}
