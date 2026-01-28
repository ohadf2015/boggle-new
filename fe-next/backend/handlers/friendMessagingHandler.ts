/**
 * Friend Messaging Handler
 * Handles direct messaging between friends with real-time delivery
 */

import type { Server, Socket } from 'socket.io';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as friendsManager from '../modules/friendsManager';
import { getSupabase } from '../modules/supabaseServer';
import { cleanProfanity } from '../utils/profanityFilter';
import {
  getCachedUserProfile,
  cacheUserProfile,
  type CachedUserProfile,
} from '../redis';

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
 * Sanitize HTML to prevent XSS attacks
 */
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get authenticated user ID from socket
 */
function getAuthUserId(socket: Socket): string | null {
  return (socket as any).authUserId || null;
}

/**
 * Broadcast event to specific user by auth ID
 */
function broadcastToUser(io: Server, authUserId: string, event: string, data: any) {
  io.sockets.sockets.forEach((sock) => {
    if ((sock as any).authUserId === authUserId) {
      sock.emit(event, data);
    }
  });
}

/**
 * Get user profile by ID (with Redis caching)
 */
async function getUserProfile(userId: string) {
  try {
    // Check Redis cache first
    const cached = await getCachedUserProfile(userId);
    if (cached) {
      return {
        username: cached.username,
        displayName: cached.displayName,
        avatar: {
          emoji: cached.avatarEmoji,
          color: cached.avatarColor,
          image: cached.avatarImage,
        },
      };
    }

    // Cache miss - fetch from database
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('MESSAGING_HANDLER', 'Supabase client not available');
      return null;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_emoji, avatar_color, avatar_image')
      .eq('id', userId)
      .single();

    if (!data) return null;

    // Cache the profile for future requests
    const profileToCache: CachedUserProfile = {
      userId,
      username: data.username,
      displayName: data.display_name,
      avatarEmoji: data.avatar_emoji || '👤',
      avatarColor: data.avatar_color || '#808080',
      avatarImage: data.avatar_image,
    };
    await cacheUserProfile(profileToCache);

    return {
      username: data.username,
      displayName: data.display_name,
      avatar: {
        emoji: data.avatar_emoji || '👤',
        color: data.avatar_color || '#808080',
        image: data.avatar_image,
      },
    };
  } catch (error) {
    logger.error('MESSAGING_HANDLER', `Error getting user profile: ${(error as Error).message}`);
    return null;
  }
}

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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.SEND_MESSAGE)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated to send messages');
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

      // Try real-time delivery to recipient
      const isDelivered = broadcastToUser(io, data.recipientUserId, 'friends:messageReceived', result.message);

      logger.info('MESSAGING', `Message sent from ${authUserId} to ${data.recipientUserId} (delivered: ${isDelivered})`);
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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.GET_MESSAGES)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.MARK_READ)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.TYPING)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.DELETE_MESSAGE)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
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
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.GET_THREADS)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
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

      // Get all friends
      const { data: friendships } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${authUserId},friend_id.eq.${authUserId}`);

      if (!friendships) {
        socket.emit('friends:threads', {
          threads: [],
          timestamp: Date.now(),
        });
        return;
      }

      // Get last message with each friend
      const threads = await Promise.all(
        friendships.map(async (friendship) => {
          const friendId = friendship.user_id === authUserId
            ? friendship.friend_id
            : friendship.user_id;

          // Get last message
          const { data: lastMsg } = await supabase
            .from('friend_messages')
            .select('message, created_at, sender_id')
            .or(`and(sender_id.eq.${authUserId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${authUserId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const unreadCount = await friendsManager.getUnreadCount(authUserId, friendId);

          // Get friend profile
          const profile = await getUserProfile(friendId);

          if (!profile || !lastMsg) return null;

          const conversationId = [authUserId, friendId].sort().join('_');

          return {
            conversationId,
            friendUserId: friendId,
            friendUsername: profile.username,
            friendDisplayName: profile.displayName,
            friendAvatar: profile.avatar,
            lastMessage: lastMsg.message,
            lastMessageAt: new Date(lastMsg.created_at).getTime(),
            unreadCount,
            isOnline: false, // Will be enriched by presence handler
          };
        })
      );

      // Filter out null threads and sort by last message
      const validThreads = threads
        .filter(t => t !== null)
        .sort((a, b) => b!.lastMessageAt - a!.lastMessageAt);

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
