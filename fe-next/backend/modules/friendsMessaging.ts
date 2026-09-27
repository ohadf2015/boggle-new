/**
 * Friends Messaging Module
 * Handles message sending, retrieval, read status, and deletion
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type { Message } from '@/shared/types/friends';
import { areFriends, isBlocked } from './friendsManager';

/**
 * Send a message to a friend
 */
export async function sendMessage(
  senderId: string,
  recipientId: string,
  message: string
): Promise<{ success: boolean; message?: Message; errorCode?: string }> {
  try {
    const isFriend = await areFriends(senderId, recipientId);
    if (!isFriend) {
      return { success: false, errorCode: 'NOT_FRIENDS' };
    }

    // Social Apps policy: a block must sever messaging even if a stale friendship row lingers.
    if (await isBlocked(senderId, recipientId)) {
      return { success: false, errorCode: 'USER_BLOCKED' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, errorCode: 'MESSAGE_EMPTY' };
    }

    if (message.length > 1000) {
      return { success: false, errorCode: 'MESSAGE_TOO_LONG' };
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
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

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
    return { success: false, errorCode: 'SERVER_ERROR' };
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

    // Filter out messages deleted by the requesting user (F-20)
    let query = supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId},deleted_for_sender.eq.false),and(sender_id.eq.${friendId},recipient_id.eq.${userId},deleted_for_recipient.eq.false)`)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

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
      })).reverse(),
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

    const { data: lastMsg } = await supabase
      .from('friend_messages')
      .select('created_at')
      .eq('id', lastMessageId)
      .single();

    if (!lastMsg) {
      return { success: false };
    }

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
