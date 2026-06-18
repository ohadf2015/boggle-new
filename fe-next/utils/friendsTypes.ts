/**
 * Friends Types
 * Shared type definitions for the friends system
 */

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  username: string;
  display_name?: string;
  avatar_image?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  avatar_config?: Record<string, unknown>;
  total_games?: number;
  ranked_mmr?: number;
  current_level?: number;
  last_seen_at?: string;
}

export interface HeadToHeadRow {
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

export interface ChallengeRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: string;
  game_room_id?: string;
  expires_at: string;
  created_at: string;
}

export interface FriendRecord {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Friend {
  id: string;
  odUserId: string;
  username: string;
  displayName?: string;
  avatarImage?: string;
  avatarEmoji: string;
  avatarColor: string;
  customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
  status: FriendStatus;
  isOnline: boolean;
  lastSeenAt?: string;
  totalGames?: number;
  rankedMmr?: number;
  currentLevel?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatarImage?: string;
  fromAvatarEmoji: string;
  fromAvatarColor: string;
  fromCustomAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
  createdAt: string;
}

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

export interface FriendChallenge {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengerDisplayName?: string;
  challengerAvatarImage?: string;
  challengerAvatarEmoji: string;
  challengerAvatarColor: string;
  challengerCustomAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
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
export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt).getTime();
  return Date.now() - lastSeen < ONLINE_THRESHOLD_MS;
}
