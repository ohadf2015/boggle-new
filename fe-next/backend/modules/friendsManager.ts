/**
 * Friends Manager Module
 * Handles all database operations for friends, messages, and challenges
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type {
  FriendRequest,
  Message,
  Challenge,
} from '@/shared/types/friends';
import {
  getCachedFriendshipStatus,
  cacheFriendshipStatus,
  invalidateFriendshipStatus,
} from '../redis';

// ==================== Friend Management ====================

/**
 * Check if two users are friends (with Redis caching)
 */
export async function areFriends(userAId: string, userBId: string): Promise<boolean> {
  try {
    // Check Redis cache first
    const cached = await getCachedFriendshipStatus(userAId, userBId);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - query database
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return false;
    }

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userAId},friend_id.eq.${userAId}`)
      .or(`user_id.eq.${userBId},friend_id.eq.${userBId}`)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('FRIENDS_MANAGER', `Error checking friendship: ${error.message}`);
      return false;
    }

    const isFriends = !!data;

    // Cache the result
    await cacheFriendshipStatus(userAId, userBId, isFriends);

    return isFriends;
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception checking friendship: ${(error as Error).message}`);
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
    // Check if already friends or request exists
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`user_id.eq.${fromUserId},friend_id.eq.${fromUserId}`)
      .or(`user_id.eq.${toUserId},friend_id.eq.${toUserId}`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return {
          success: false,
          errorCode: 'ALREADY_FRIENDS',
          message: 'Already friends with this user',
        };
      }
      return {
        success: false,
        errorCode: 'REQUEST_ALREADY_EXISTS',
        message: 'Friend request already sent',
      };
    }

    // Create friend request
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
        fromUsername: '', // Will be populated by handler
        toUsername: '',
        fromAvatar: { emoji: '👤', color: '#808080' },
        status: 'pending',
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: new Date(data.created_at).getTime() + 30 * 24 * 60 * 60 * 1000, // 30 days
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

    // Verify the request exists and is for the accepting user
    const { data: request } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', acceptingUserId)
      .eq('status', 'pending')
      .single();

    if (!request) {
      return {
        success: false,
        errorCode: 'REQUEST_NOT_FOUND',
      };
    }

    // Update status to accepted
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error accepting friend request: ${error.message}`);
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
      };
    }

    // Invalidate friendship cache - they are now friends
    await invalidateFriendshipStatus(request.user_id, acceptingUserId);

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception accepting friend request: ${(error as Error).message}`);
    return {
      success: false,
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<{ success: boolean }> {
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
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .or(`user_id.eq.${friendUserId},friend_id.eq.${friendUserId}`);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error unfriending user: ${error.message}`);
      return { success: false };
    }

    // Invalidate friendship cache - they are no longer friends
    await invalidateFriendshipStatus(userId, friendUserId);

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception unfriending user: ${(error as Error).message}`);
    return { success: false };
  }
}

// ==================== Messaging ====================

/**
 * Send a message to a friend
 */
export async function sendMessage(
  senderId: string,
  recipientId: string,
  message: string
): Promise<{ success: boolean; message?: Message; errorCode?: string }> {
  try {
    // Verify friendship
    const isFriend = await areFriends(senderId, recipientId);
    if (!isFriend) {
      return {
        success: false,
        errorCode: 'NOT_FRIENDS',
      };
    }

    // Validate message length
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        errorCode: 'MESSAGE_EMPTY',
      };
    }

    if (message.length > 1000) {
      return {
        success: false,
        errorCode: 'MESSAGE_TOO_LONG',
      };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data, error } = await supabase
      .from('friend_messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error sending message: ${error.message}`);
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
      };
    }

    // Create conversation ID (sorted user IDs)
    const conversationId = [senderId, recipientId].sort().join('_');

    return {
      success: true,
      message: {
        messageId: data.id,
        conversationId,
        fromUserId: senderId,
        toUserId: recipientId,
        message: data.message,
        timestamp: new Date(data.created_at).getTime(),
        isRead: false,
        isDeleted: false,
      },
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception sending message: ${(error as Error).message}`);
    return {
      success: false,
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * Get message history between two users
 */
export async function getMessages(
  userId: string,
  friendId: string,
  limit: number = 50,
  before?: number
): Promise<{ messages: Message[]; hasMore: boolean; oldestTimestamp: number }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { messages: [], hasMore: false, oldestTimestamp: 0 };
    }

    let query = supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    if (before) {
      query = query.lt('created_at', new Date(before).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error getting messages: ${error.message}`);
      return { messages: [], hasMore: false, oldestTimestamp: 0 };
    }

    const hasMore = data.length > limit;
    const messages = data.slice(0, limit);
    const conversationId = [userId, friendId].sort().join('_');

    return {
      messages: messages.map(msg => ({
        messageId: msg.id,
        conversationId,
        fromUserId: msg.sender_id,
        toUserId: msg.recipient_id,
        message: msg.message,
        timestamp: new Date(msg.created_at).getTime(),
        isRead: msg.read,
        readAt: msg.read_at ? new Date(msg.read_at).getTime() : undefined,
        isDeleted: msg.deleted_for_sender || msg.deleted_for_recipient,
      })).reverse(), // Reverse to get chronological order
      hasMore,
      oldestTimestamp: messages.length > 0 ? new Date(messages[messages.length - 1].created_at).getTime() : 0,
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception getting messages: ${(error as Error).message}`);
    return { messages: [], hasMore: false, oldestTimestamp: 0 };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(
  recipientId: string,
  senderId: string,
  lastMessageId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false };
    }

    // Get timestamp of the last read message
    const { data: lastMsg } = await supabase
      .from('friend_messages')
      .select('created_at')
      .eq('id', lastMessageId)
      .single();

    if (!lastMsg) {
      return { success: false };
    }

    // Mark all messages from sender up to this timestamp as read
    const { error } = await supabase
      .from('friend_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', recipientId)
      .eq('sender_id', senderId)
      .eq('read', false)
      .lte('created_at', lastMsg.created_at);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error marking messages read: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception marking messages read: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Soft delete a message
 */
export async function deleteMessage(
  messageId: string,
  deletingUserId: string
): Promise<{ success: boolean; errorCode?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    // Get the message to determine if user is sender or recipient
    const { data: msg } = await supabase
      .from('friend_messages')
      .select('sender_id, recipient_id')
      .eq('id', messageId)
      .single();

    if (!msg) {
      return { success: false, errorCode: 'MESSAGE_NOT_FOUND' };
    }

    const isSender = msg.sender_id === deletingUserId;
    const isRecipient = msg.recipient_id === deletingUserId;

    if (!isSender && !isRecipient) {
      return { success: false, errorCode: 'UNAUTHORIZED' };
    }

    // Soft delete for the deleting user
    const updateData = isSender
      ? { deleted_for_sender: true }
      : { deleted_for_recipient: true };

    const { error } = await supabase
      .from('friend_messages')
      .update(updateData)
      .eq('id', messageId);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error deleting message: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception deleting message: ${(error as Error).message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string, friendId?: string): Promise<number> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return 0;
    }

    let query = supabase
      .from('friend_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false)
      .eq('deleted_for_recipient', false);

    if (friendId) {
      query = query.eq('sender_id', friendId);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error getting unread count: ${error.message}`);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception getting unread count: ${(error as Error).message}`);
    return 0;
  }
}

// ==================== Challenges ====================

/**
 * Send a challenge to a friend
 */
export async function sendChallenge(
  challengerId: string,
  challengedId: string,
  challengeData: {
    challengeId: string;
    challengeType: 'new_game' | 'join_room';
    gameSettings?: { language?: string; timerSeconds?: number; mode?: string };
    message?: string;
  }
): Promise<{ success: boolean; challenge?: Challenge; errorCode?: string }> {
  try {
    // Verify friendship
    const isFriend = await areFriends(challengerId, challengedId);
    if (!isFriend) {
      return {
        success: false,
        errorCode: 'NOT_FRIENDS',
      };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    const { data, error } = await supabase
      .from('friend_challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        challenge_id: challengeData.challengeId,
        challenge_type: challengeData.challengeType,
        message: challengeData.message,
        game_mode: challengeData.gameSettings?.mode,
        game_language: challengeData.gameSettings?.language,
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error sending challenge: ${error.message}`);
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
      };
    }

    return {
      success: true,
      challenge: {
        challengeId: data.id,
        fromUserId: challengerId,
        toUserId: challengedId,
        fromUsername: '', // Will be populated by handler
        toUsername: '',
        fromAvatar: { emoji: '👤', color: '#808080' },
        challengeType: data.challenge_type as 'new_game' | 'join_room',
        roomCode: data.challenge_id,
        gameSettings: challengeData.gameSettings,
        message: data.message,
        status: 'pending',
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: new Date(data.expires_at).getTime(),
      },
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception sending challenge: ${(error as Error).message}`);
    return {
      success: false,
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * Accept a challenge
 */
export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<{ success: boolean; challenge?: Challenge; roomCode?: string; errorCode?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    // Get the challenge
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .single();

    if (!challenge) {
      return {
        success: false,
        errorCode: 'CHALLENGE_NOT_FOUND',
      };
    }

    // Check if expired
    if (new Date(challenge.expires_at) < new Date()) {
      return {
        success: false,
        errorCode: 'CHALLENGE_EXPIRED',
      };
    }

    // Update status to accepted
    const { error } = await supabase
      .from('friend_challenges')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', challengeId);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error accepting challenge: ${error.message}`);
      return {
        success: false,
        errorCode: 'SERVER_ERROR',
      };
    }

    return {
      success: true,
      roomCode: challenge.challenge_id,
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception accepting challenge: ${(error as Error).message}`);
    return {
      success: false,
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * Decline a challenge
 */
export async function declineChallenge(challengeId: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false };
    }

    const { error } = await supabase
      .from('friend_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId)
      .eq('status', 'pending');

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error declining challenge: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception declining challenge: ${(error as Error).message}`);
    return { success: false };
  }
}

/**
 * Get pending challenges
 */
export async function getPendingChallenges(
  userId: string
): Promise<{ sent: Challenge[]; received: Challenge[] }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { sent: [], received: [] };
    }

    // Get received challenges
    const { data: received } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Get sent challenges
    const { data: sent } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenger_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return {
      sent: (sent || []).map(c => ({
        challengeId: c.id,
        fromUserId: c.challenger_id,
        toUserId: c.challenged_id,
        fromUsername: '',
        toUsername: '',
        fromAvatar: { emoji: '👤', color: '#808080' },
        challengeType: c.challenge_type as 'new_game' | 'join_room',
        roomCode: c.challenge_id,
        message: c.message,
        status: 'pending',
        createdAt: new Date(c.created_at).getTime(),
        expiresAt: new Date(c.expires_at).getTime(),
      })),
      received: (received || []).map(c => ({
        challengeId: c.id,
        fromUserId: c.challenger_id,
        toUserId: c.challenged_id,
        fromUsername: '',
        toUsername: '',
        fromAvatar: { emoji: '👤', color: '#808080' },
        challengeType: c.challenge_type as 'new_game' | 'join_room',
        roomCode: c.challenge_id,
        message: c.message,
        status: 'pending',
        createdAt: new Date(c.created_at).getTime(),
        expiresAt: new Date(c.expires_at).getTime(),
      })),
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception getting pending challenges: ${(error as Error).message}`);
    return { sent: [], received: [] };
  }
}

/**
 * Expire old challenges (cron job)
 */
export async function expireOldChallenges(): Promise<number> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return 0;
    }

    const { data, error } = await supabase
      .rpc('expire_old_challenges');

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error expiring challenges: ${error.message}`);
      return 0;
    }

    return data || 0;
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception expiring challenges: ${(error as Error).message}`);
    return 0;
  }
}
