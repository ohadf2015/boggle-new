/**
 * Friends Manager Module
 * Handles friend relationship operations (add, accept, decline, unfriend)
 *
 * Messaging operations: ./friendsMessaging.ts
 * Challenge operations: ./friendsChallenges.ts
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type { FriendRequest } from '@/shared/types/friends';
import {
  getCachedFriendshipStatus,
  cacheFriendshipStatus,
  invalidateFriendshipStatus,
} from '../redis';

// Re-export messaging and challenge modules for backward compatibility
export {
  sendMessage,
  getMessages,
  markMessagesRead,
  deleteMessage,
  getUnreadCount,
} from './friendsMessaging';

export {
  sendChallenge,
  acceptChallenge,
  declineChallenge,
  getPendingChallenges,
  expireOldChallenges,
} from './friendsChallenges';

// ==================== Friend Management ====================

/** Max outgoing pending requests per user — stops request spam / list bloat. */
export const MAX_PENDING_OUTGOING_REQUESTS = 100;
const FRIEND_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * User ids are interpolated into PostgREST `.or()` filter strings below, so
 * anything that is not a UUID (commas, parens, dots) could rewrite the filter.
 */
export function isValidUserId(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

/** PostgREST `.or()` filter matching the friendship row between two users in either direction. */
function pairFilter(a: string, b: string): string {
  return `and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`;
}

type PairRow = { id: string; user_id: string; friend_id: string; status: string };

/** Duplicate rows for a pair can exist (no unique index in repo migrations): blocked > accepted > pending. */
function pickPairRow(rows: PairRow[] | null | undefined): PairRow | null {
  if (!rows || rows.length === 0) return null;
  const rank: Record<string, number> = { blocked: 3, accepted: 2, pending: 1 };
  return [...rows].sort((x, y) => (rank[y.status] ?? 0) - (rank[x.status] ?? 0))[0];
}

/**
 * Check if two users are friends (with Redis caching)
 */
export async function areFriends(userAId: string, userBId: string): Promise<boolean> {
  try {
    const cached = await getCachedFriendshipStatus(userAId, userBId);
    if (cached !== null) {
      return cached;
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return false;
    }

    if (!isValidUserId(userAId) || !isValidUserId(userBId)) return false;

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'accepted')
      .or(pairFilter(userAId, userBId))
      .limit(1);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error checking friendship: ${error.message}`);
      return false;
    }

    const isFriends = (data?.length ?? 0) > 0;
    await cacheFriendshipStatus(userAId, userBId, isFriends);

    return isFriends;
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception checking friendship: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Check if either user has blocked the other
 */
export async function isBlocked(userAId: string, userBId: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    if (!isValidUserId(userAId) || !isValidUserId(userBId)) return false;

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'blocked')
      .or(pairFilter(userAId, userBId))
      .limit(1);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error checking block status: ${error.message}`);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception checking block status: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Send a friend request.
 * If the target already has a pending request to us, that request is accepted
 * instead (`autoAccepted`) — two people adding each other should become friends,
 * not hit "request already exists".
 */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{
  success: boolean;
  request?: FriendRequest;
  autoAccepted?: boolean;
  errorCode?: string;
  message?: string;
}> {
  try {
    if (fromUserId === toUserId) {
      return {
        success: false,
        errorCode: 'CANNOT_ADD_SELF',
        message: 'You cannot send a friend request to yourself',
      };
    }

    if (!isValidUserId(fromUserId) || !isValidUserId(toUserId)) {
      return { success: false, errorCode: 'VALIDATION_FAILED', message: 'Invalid user ID' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data: existingRows } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status')
      .or(pairFilter(fromUserId, toUserId))
      .limit(10);
    const existing = pickPairRow(existingRows as PairRow[] | null);

    if (existing) {
      if (existing.status === 'accepted') {
        return {
          success: false,
          errorCode: 'ALREADY_FRIENDS',
          message: 'Already friends with this user',
        };
      }
      if (existing.status === 'blocked') {
        return {
          success: false,
          errorCode: 'USER_BLOCKED',
          message: 'Cannot send request to this user',
        };
      }
      if (existing.user_id === toUserId) {
        // They already asked us — accept it.
        const { error: acceptError } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', existing.id)
          .eq('status', 'pending');
        if (acceptError) {
          logger.error('FRIENDS_MANAGER', `Error auto-accepting mutual request: ${acceptError.message}`);
          return { success: false, errorCode: 'SERVER_ERROR', message: 'Failed to send friend request' };
        }
        await invalidateFriendshipStatus(fromUserId, toUserId);
        return {
          success: true,
          autoAccepted: true,
          request: {
            requestId: existing.id,
            fromUserId: toUserId,
            toUserId: fromUserId,
            fromUsername: '',
            toUsername: '',
            fromAvatar: { emoji: '\u{1F464}', color: '#808080' },
            status: 'accepted',
            createdAt: Date.now(),
            expiresAt: Date.now() + FRIEND_REQUEST_TTL_MS,
          },
        };
      }
      return {
        success: false,
        errorCode: 'REQUEST_ALREADY_EXISTS',
        message: 'Friend request already sent',
      };
    }

    const { count: pendingCount } = await supabase
      .from('friends')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', fromUserId)
      .eq('status', 'pending');
    if ((pendingCount ?? 0) >= MAX_PENDING_OUTGOING_REQUESTS) {
      return {
        success: false,
        errorCode: 'TOO_MANY_PENDING_REQUESTS',
        message: 'Too many pending friend requests — wait for some to be answered or cancel a few',
      };
    }

    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: fromUserId,
        friend_id: toUserId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error sending friend request: ${error.message}`);
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
        message: 'Failed to send friend request',
      };
    }

    return {
      success: true,
      request: {
        requestId: data.id,
        fromUserId,
        toUserId,
        fromUsername: '',
        toUsername: '',
        fromAvatar: { emoji: '\u{1F464}', color: '#808080' },
        status: 'pending',
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: new Date(data.created_at).getTime() + FRIEND_REQUEST_TTL_MS,
      },
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception sending friend request: ${(error as Error).message}`);
    return {
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Failed to send friend request',
    };
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  requestId: string,
  acceptingUserId: string
): Promise<{ success: boolean; errorCode?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data: request } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', acceptingUserId)
      .eq('status', 'pending')
      .single();

    if (!request) {
      return { success: false, errorCode: 'REQUEST_NOT_FOUND' };
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error accepting friend request: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    await invalidateFriendshipStatus(request.user_id, acceptingUserId);

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception accepting friend request: ${(error as Error).message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
}

/**
 * Decline a friend request.
 * Requires `userId` to verify the decliner is the intended recipient (friend_id).
 */
export async function declineFriendRequest(requestId: string, userId: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false };
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error declining friend request: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception declining friend request: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Unfriend a user
 */
export async function unfriend(userId: string, friendUserId: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false };
    }

    if (!isValidUserId(userId) || !isValidUserId(friendUserId)) return { success: false };

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('status', 'accepted')
      .or(pairFilter(userId, friendUserId));

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error unfriending user: ${error.message}`);
      return { success: false };
    }

    await invalidateFriendshipStatus(userId, friendUserId);

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception unfriending user: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Block a user. Done server-side (not from the browser) so the Redis friendship
 * cache is invalidated: a cached `friends = true` would otherwise keep DMs and
 * challenges flowing for up to FRIENDSHIP_STATUS TTL after the block.
 *
 * An existing row (friendship / pending request, either direction) is flipped to
 * a block owned by the blocker in a single UPDATE, so a failure never leaves the
 * pair with neither friendship nor block.
 */
export async function blockUser(
  userId: string,
  targetUserId: string
): Promise<{ success: boolean; wasFriends?: boolean; errorCode?: string }> {
  try {
    if (userId === targetUserId) return { success: false, errorCode: 'CANNOT_ADD_SELF' };
    if (!isValidUserId(userId) || !isValidUserId(targetUserId)) {
      return { success: false, errorCode: 'VALIDATION_FAILED' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data: rows } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status')
      .or(pairFilter(userId, targetUserId))
      .limit(10);
    const existing = pickPairRow(rows as PairRow[] | null);

    let error: { message: string } | null = null;
    if (existing) {
      if (existing.status === 'blocked' && existing.user_id === userId) {
        return { success: true, wasFriends: false }; // already blocked by us
      }
      ({ error } = await supabase
        .from('friends')
        .update({ user_id: userId, friend_id: targetUserId, status: 'blocked' })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase
        .from('friends')
        .insert({ user_id: userId, friend_id: targetUserId, status: 'blocked' }));
    }

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error blocking user: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    await invalidateFriendshipStatus(userId, targetUserId);

    // Best effort: a block also withdraws live challenges between the pair.
    await supabase
      .from('friend_challenges')
      .update({ status: 'declined' })
      .eq('status', 'pending')
      .or(
        `and(challenger_id.eq.${userId},challenged_id.eq.${targetUserId}),and(challenger_id.eq.${targetUserId},challenged_id.eq.${userId})`
      );

    return { success: true, wasFriends: existing?.status === 'accepted' };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception blocking user: ${(error as Error).message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
}

/**
 * Remove OUR block on a user (never the other side's block on us).
 */
export async function unblockUser(
  userId: string,
  targetUserId: string
): Promise<{ success: boolean; errorCode?: string }> {
  try {
    if (!isValidUserId(userId) || !isValidUserId(targetUserId)) {
      return { success: false, errorCode: 'VALIDATION_FAILED' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', targetUserId)
      .eq('status', 'blocked');

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error unblocking user: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    await invalidateFriendshipStatus(userId, targetUserId);
    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception unblocking user: ${(error as Error).message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
}
