/**
 * Friend Messaging Handler
 * Handles direct messaging between friends with real-time delivery
 */

import type { Server, Socket } from 'socket.io';
import type { FriendThreadRow } from '../../shared/types/friends';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as friendsManager from '../modules/friendsManager';
import { getSupabase } from '../modules/supabaseServer';
import { cleanProfanity } from '../utils/profanityFilter';
import { sanitizeHtml } from '../utils/sanitize';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../utils/socialHelpers';
import { ensureSocialCapability } from '../utils/socialPolicyServer';
import { notifyDirectMessage } from '../modules/pushNotificationTriggers';

// Rate limit weights
const RATE_WEIGHTS = {
  SEND_MESSAGE: 1, // Same as chat
  GET_MESSAGES: 2, // Database query
  MARK_READ: 1,
  TYPING: 0.5, // Lightweight, frequent
  DELETE_MESSAGE: 1,
  GET_THREADS: 2,
};

/**
 * Register friend messaging socket event handlers
 */
export function registerFriendMessagingHandlers(io: Server, socket: Socket): void {

  // ==================== Send Message ====================
  socket.on('friends:sendMessage', async (data: {
    recipientUserId: string;
    message: string;
    tempId?: string;
  }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.SEND_MESSAGE)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED, { message: 'Must be authenticated to send messages' });
      return;
    }

    // Families Policy: child / unknown-age users may not exchange freeform DMs
    // unless an adult has explicitly enabled it. Server-side enforcement.
    if (!(await ensureSocialCapability(socket, 'friendMessaging'))) {
      emitError(socket, ErrorCodes.SOCIAL_RESTRICTED, { message: 'Messaging is turned off for this account' });
      return;
    }

    // Validate input
    if (!data?.recipientUserId || !data?.message) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Recipient and message are required',
      });
      return;
    }

    try {
      // Clean profanity and sanitize HTML
      const cleanMessage = sanitizeHtml(cleanProfanity(data.message.trim()));

      // Send message via manager
      const result = await friendsManager.sendMessage(
        authUserId,
        data.recipientUserId,
        cleanMessage
      );

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: 'Failed to send message',
        });
        return;
      }

      // Confirm to sender
      socket.emit('friends:messageSent', {
        messageId: result.message!.messageId,
        tempId: data.tempId,
        timestamp: result.message!.timestamp,
      });

      // Real-time delivery to recipient via user room
      broadcastToUser(io, data.recipientUserId, 'friends:messageReceived', result.message);

      // Push notification for offline recipients (N-1)
      // If recipient has an active socket, the in-app toast handles it — skip FCM push
      const recipientSockets = await io.in(`user:${data.recipientUserId}`).fetchSockets();
      const recipientOnline = recipientSockets.length > 0;
      const senderProfile = await getUserProfile(authUserId);
      notifyDirectMessage(
        data.recipientUserId,
        senderProfile?.username ?? 'Someone',
        cleanMessage,
        authUserId,
        recipientOnline ? 'in_app_only' : 'both'
      ).catch(() => {});

      logger.info('MESSAGING', `Message sent from ${authUserId} to ${data.recipientUserId}`);
    } catch (error) {
      logger.error('MESSAGING_HANDLER', `Error sending message: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to send message',
      });
    }
  });

  // ==================== Get Message History ====================
  socket.on('friends:getMessages', async (data: {
    friendUserId: string;
    before?: number;
    limit?: number;
  }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.GET_MESSAGES)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.friendUserId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Friend user ID is required',
      });
      return;
    }

    try {
      const limit = Math.min(data.limit || 50, 100); // Max 100
      const result = await friendsManager.getMessages(
        authUserId,
        data.friendUserId,
        limit,
        data.before
      );

      socket.emit('friends:messageHistory', {
        friendUserId: data.friendUserId,
        messages: result.messages,
        hasMore: result.hasMore,
        oldestTimestamp: result.oldestTimestamp,
      });
    } catch (error) {
      logger.error('MESSAGING_HANDLER', `Error getting messages: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to get messages',
      });
    }
  });

  // ==================== Mark Messages as Read ====================
  socket.on('friends:markRead', async (data: {
    friendUserId: string;
    lastReadMessageId: string;
  }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.MARK_READ)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.friendUserId || !data?.lastReadMessageId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Friend user ID and message ID are required',
      });
      return;
    }

    try {
      const result = await friendsManager.markMessagesRead(
        authUserId,
        data.friendUserId,
        data.lastReadMessageId
      );

      if (!result.success) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to mark messages as read',
        });
        return;
      }

      // Notify sender that messages were read
      broadcastToUser(io, data.friendUserId, 'friends:messagesRead', {
        friendUserId: authUserId,
        lastReadMessageId: data.lastReadMessageId,
        timestamp: Date.now(),
      });

      logger.debug('MESSAGING', `Messages marked read: ${authUserId} read ${data.friendUserId}'s messages`);
    } catch (error) {
      logger.error('MESSAGING_HANDLER', `Error marking messages read: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to mark messages as read',
      });
    }
  });

  // ==================== Typing Indicator ====================
  socket.on('friends:typing', async (data: {
    recipientUserId: string;
    isTyping: boolean;
  }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.TYPING)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) return;

    if (!data?.recipientUserId) return;

    try {
      // Verify they are friends before broadcasting typing status
      const areFriends = await friendsManager.areFriends(authUserId, data.recipientUserId);
      if (!areFriends) return;

      // Get sender profile
      const profile = await getUserProfile(authUserId);
      if (!profile) return;

      // Broadcast typing status to recipient only
      broadcastToUser(io, data.recipientUserId, 'friends:userTyping', {
        userId: authUserId,
        username: profile.username,
        isTyping: data.isTyping,
      });
    } catch (error) {
      // Silent fail for typing indicators
      logger.debug('MESSAGING_HANDLER', `Error broadcasting typing indicator: ${(error as Error).message}`);
    }
  });

  // ==================== Delete Message ====================
  socket.on('friends:deleteMessage', async (data: { messageId: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.DELETE_MESSAGE)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.messageId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Message ID is required',
      });
      return;
    }

    try {
      const result = await friendsManager.deleteMessage(data.messageId, authUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: 'Failed to delete message',
        });
        return;
      }

      // Get message details to create conversation ID
      const supabase = getSupabase();
      if (!supabase) {
        logger.error('MESSAGING_HANDLER', 'Supabase client not available');
        return;
      }

      const { data: msg } = await supabase
        .from('friend_messages')
        .select('sender_id, recipient_id')
        .eq('id', data.messageId)
        .single();

      if (msg) {
        const conversationId = [msg.sender_id, msg.recipient_id].sort().join('_');

        socket.emit('friends:messageDeleted', {
          messageId: data.messageId,
          conversationId,
          timestamp: Date.now(),
        });
      }

      logger.info('MESSAGING', `Message deleted: ${data.messageId} by ${authUserId}`);
    } catch (error) {
      logger.error('MESSAGING_HANDLER', `Error deleting message: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to delete message',
      });
    }
  });

  // ==================== Get Message Threads ====================
  socket.on('friends:getThreads', async () => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.GET_THREADS)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      // One round-trip: last message + profile + unread count per thread.
      // Replaces the old per-friend N+1. See migration 20260628000000_friend_threads_rpc.sql.
      const { data: rows, error } = await supabase.rpc('get_friend_threads', { p_user_id: authUserId });

      if (error || !rows) {
        if (error) {
          logger.error('MESSAGING_HANDLER', `Error getting threads: ${error.message}`);
        }
        socket.emit('friends:threads', { threads: [], timestamp: Date.now() });
        return;
      }

      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const validThreads = (rows as FriendThreadRow[])
        .map((row) => ({
          conversationId: [authUserId, row.friend_id].sort().join('_'),
          friendUserId: row.friend_id,
          friendUsername: row.username,
          friendDisplayName: row.display_name || undefined,
          friendAvatar: {
            emoji: row.avatar_emoji || '👤',
            color: row.avatar_color || '#808080',
            image: row.avatar_image || undefined,
            customAvatar: row.avatar_config || undefined,
          },
          lastMessage: row.last_message,
          lastMessageAt: new Date(row.last_message_at).getTime(),
          unreadCount: Number(row.unread_count) || 0,
          isOnline: !!row.last_seen_at && new Date(row.last_seen_at).getTime() > fiveMinAgo,
        }))
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt);

      socket.emit('friends:threads', {
        threads: validThreads,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('MESSAGING_HANDLER', `Error getting threads: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to get message threads',
      });
    }
  });
}
