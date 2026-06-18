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

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(user_id.eq.${userAId},friend_id.eq.${userBId}),and(user_id.eq.${userBId},friend_id.eq.${userAId})`)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('FRIENDS_MANAGER', `Error checking friendship: ${error.message}`);
      return false;
    }

    const isFriends = !!data;
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

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'blocked')
      .or(`and(user_id.eq.${userAId},friend_id.eq.${userBId}),and(user_id.eq.${userBId},friend_id.eq.${userAId})`)
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
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; request?: FriendRequest; errorCode?: string; message?: string }> {
  try {
    if (fromUserId === toUserId) {
      return {
        success: false,
        errorCode: 'CANNOT_ADD_SELF',
        message: 'You cannot send a friend request to yourself',
      };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId})`)
      .single();

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
      return {
        success: false,
        errorCode: 'REQUEST_ALREADY_EXISTS',
        message: 'Friend request already sent',
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
        expiresAt: new Date(data.created_at).getTime() + 30 * 24 * 60 * 60 * 1000,
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

    const { error} = await supabase
      .from('friends')
      .delete()
      .eq('status', 'accepted')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${userId})`);

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
