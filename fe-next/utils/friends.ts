import { createClient } from '@/utils/supabase/client';
import logger from '@/utils/logger';

/**
 * Friend relationship status
 */
export type FriendStatus = 'pending' | 'accepted' | 'blocked';

// Database row types for Supabase queries
interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  total_games?: number;
  ranked_mmr?: number;
  current_level?: number;
  last_seen_at?: string;
}

interface HeadToHeadRow {
  id: string;
  opponent_id: string;
  my_wins: number;
  their_wins: number;
  draws: number;
  total_games: number;
  my_total_score: number;
  their_total_score: number;
  last_game_at?: string;
}

interface ChallengeRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: string;
  game_room_id?: string;
  expires_at: string;
  created_at: string;
}

/**
 * Friend record from database
 */
export interface FriendRecord {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Friend with profile data
 */
export interface Friend {
  id: string;
  odUserId: string;
  username: string;
  displayName?: string;
  avatarEmoji: string;
  avatarColor: string;
  status: FriendStatus;
  isOnline: boolean;
  lastSeenAt?: string;
  // Stats for display
  totalGames?: number;
  rankedMmr?: number;
  currentLevel?: number;
}

/**
 * Friend request (pending incoming)
 */
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatarEmoji: string;
  fromAvatarColor: string;
  createdAt: string;
}

/**
 * Head-to-head record between two players
 */
export interface HeadToHeadRecord {
  id: string;
  opponentId: string;
  opponentUsername: string;
  opponentAvatarEmoji: string;
  opponentAvatarColor: string;
  myWins: number;
  theirWins: number;
  draws: number;
  totalGames: number;
  myTotalScore: number;
  theirTotalScore: number;
  lastGameAt?: string;
}

/**
 * Direct challenge between friends
 */
export interface FriendChallenge {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengerAvatarEmoji: string;
  challengerAvatarColor: string;
  challengeId: string;
  challengeCode: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed';
  createdAt: string;
}

// Online threshold: users seen in last 5 minutes are considered online
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Check if a user is considered online based on last_seen_at
 */
function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt).getTime();
  return Date.now() - lastSeen < ONLINE_THRESHOLD_MS;
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if relationship already exists
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
    .eq('friend_id', user.id) // Only the recipient can accept
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

  // Delete the request instead of changing status
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

  // First, remove any existing relationship
  await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);

  // Then create a blocked relationship
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
 * Get all accepted friends for the current user
 */
export async function getFriends(): Promise<Friend[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all accepted friend relationships
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
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error || !friendships) {
    logger.error('Error fetching friends:', error);
    return [];
  }

  // Get the IDs of friends (the other person in each relationship)
  const friendIds = (friendships as FriendshipRow[]).map((f: FriendshipRow) =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  if (friendIds.length === 0) return [];

  // Fetch profile data for all friends
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji, avatar_color, total_games, ranked_mmr, current_level, last_seen_at')
    .in('id', friendIds);

  if (profileError || !profiles) {
    logger.error('Error fetching friend profiles:', profileError);
    return [];
  }

  // Map to Friend objects
  const typedFriendships = friendships as FriendshipRow[];
  return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
    id: typedFriendships.find((f: FriendshipRow) => f.user_id === p.id || f.friend_id === p.id)?.id || '',
    odUserId: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarEmoji: p.avatar_emoji || '😊',
    avatarColor: p.avatar_color || '#4F46E5',
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
export async function getPendingRequests(): Promise<FriendRequest[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get pending requests where current user is the recipient
  const { data: requests, error } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      created_at,
      profiles!friends_user_id_fkey (
        username,
        display_name,
        avatar_emoji,
        avatar_color
      )
    `)
    .eq('friend_id', user.id)
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
      avatar_emoji?: string;
      avatar_color?: string;
    }>;
  }
  return (requests as unknown as RequestWithProfile[]).map((r: RequestWithProfile) => {
    const profile = r.profiles?.[0];
    return {
      id: r.id,
      fromUserId: r.user_id,
      fromUsername: profile?.username || 'Unknown',
      fromDisplayName: profile?.display_name,
      fromAvatarEmoji: profile?.avatar_emoji || '😊',
      fromAvatarColor: profile?.avatar_color || '#4F46E5',
      createdAt: r.created_at,
    };
  });
}

/**
 * Get outgoing friend requests (sent by current user, still pending)
 */
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: requests, error } = await supabase
    .from('friends')
    .select(`
      id,
      friend_id,
      created_at,
      profiles!friends_friend_id_fkey (
        username,
        display_name,
        avatar_emoji,
        avatar_color
      )
    `)
    .eq('user_id', user.id)
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
      avatar_emoji?: string;
      avatar_color?: string;
    }>;
  }
  return (requests as unknown as OutgoingRequestWithProfile[]).map((r: OutgoingRequestWithProfile) => {
    const profile = r.profiles?.[0];
    return {
      id: r.id,
      fromUserId: r.friend_id,
      fromUsername: profile?.username || 'Unknown',
      fromDisplayName: profile?.display_name,
      fromAvatarEmoji: profile?.avatar_emoji || '😊',
      fromAvatarColor: profile?.avatar_color || '#4F46E5',
      createdAt: r.created_at,
    };
  });
}

/**
 * Search for users to add as friends
 */
export async function searchUsers(query: string, limit: number = 10): Promise<Friend[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || query.length < 2) return [];

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji, avatar_color, total_games, current_level, last_seen_at')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', user.id)
    .limit(limit);

  if (error || !profiles) {
    logger.error('Error searching users:', error);
    return [];
  }

  // Get existing relationships to filter
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
    avatarEmoji: p.avatar_emoji || '😊',
    avatarColor: p.avatar_color || '#4F46E5',
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

  // Ensure consistent ordering for lookup
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

  // Get opponent profile
  const { data: opponent } = await supabase
    .from('profiles')
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

  // Get opponent IDs
  const typedRecords = records as H2HRecord[];
  const opponentIds = typedRecords.map((r: H2HRecord) =>
    r.player1_id === user.id ? r.player2_id : r.player1_id
  );

  if (opponentIds.length === 0) return [];

  // Fetch opponent profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_emoji, avatar_color')
    .in('id', opponentIds);

  const typedProfiles = (profiles || []) as OpponentProfile[];
  const profileMap = new Map(typedProfiles.map((p: OpponentProfile) => [p.id, p]));

  return typedRecords.map((r: H2HRecord) => {
    const isPlayer1 = r.player1_id === user.id;
    const opponentId = isPlayer1 ? r.player2_id : r.player1_id;
    const opponent = profileMap.get(opponentId);

    return {
      id: r.id,
      opponentId,
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
export async function getPendingChallenges(): Promise<FriendChallenge[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

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
        avatar_emoji,
        avatar_color
      ),
      score_challenges!friend_challenges_challenge_id_fkey (
        challenge_code
      )
    `)
    .eq('challenged_id', user.id)
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
    profiles: Array<{
      username: string;
      avatar_emoji?: string;
      avatar_color?: string;
    }>;
    score_challenges: Array<{
      challenge_code: string;
    }>;
  }
  return (challenges as unknown as ChallengeWithRelations[]).map((c: ChallengeWithRelations) => {
    const challenger = c.profiles?.[0];
    const challenge = c.score_challenges?.[0];
    return {
      id: c.id,
      challengerId: c.challenger_id,
      challengerUsername: challenger?.username || 'Unknown',
      challengerAvatarEmoji: challenger?.avatar_emoji || '😊',
      challengerAvatarColor: challenger?.avatar_color || '#4F46E5',
      challengeId: c.challenge_id,
      challengeCode: challenge?.challenge_code || '',
      message: c.message,
      status: c.status,
      createdAt: c.created_at,
    };
  });
}

/**
 * Update online status (call periodically while user is active)
 */
export async function updateOnlineStatus(): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
}

/**
 * Get friend by username
 */
export async function getUserByUsername(username: string): Promise<Friend | null> {
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji, avatar_color, total_games, current_level, last_seen_at')
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
    avatarEmoji: profile.avatar_emoji || '😊',
    avatarColor: profile.avatar_color || '#4F46E5',
    status: 'none' as FriendStatus,
    isOnline: isUserOnline(profile.last_seen_at),
    lastSeenAt: profile.last_seen_at,
    totalGames: profile.total_games,
    currentLevel: profile.current_level,
  };
}
