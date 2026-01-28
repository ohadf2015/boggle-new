/**
 * Friends Handler
 * Handles friend management socket events (add, accept, decline, unfriend, search)
 */

import type { Server, Socket } from 'socket.io';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as friendsManager from '../modules/friendsManager';
import { getSupabase } from '../modules/supabaseServer';
import {
  getCachedUserProfile,
  cacheUserProfile,
  type CachedUserProfile,
} from '../redis';

// Rate limit weights
const RATE_WEIGHTS = {
  SEND_REQUEST: 2, // Prevent spam requests
  ACCEPT_REQUEST: 1,
  DECLINE_REQUEST: 1,
  UNFRIEND: 1,
  BLOCK: 1,
  GET_LIST: 1,
  SEARCH_USERS: 3, // Heavy query
  GET_PENDING: 1,
};

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
  // Find all sockets for this user
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
      // Compute isOnline from cached lastSeenAt
      const isOnline = cached.lastSeenAt
        ? new Date(cached.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000)
        : false;

      return {
        username: cached.username,
        displayName: cached.displayName,
        avatar: {
          emoji: cached.avatarEmoji,
          color: cached.avatarColor,
          image: cached.avatarImage,
        },
        isOnline,
      };
    }

    // Cache miss - fetch from database
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_HANDLER', 'Supabase client not available');
      return null;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_emoji, avatar_color, avatar_image, last_seen_at')
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
      lastSeenAt: data.last_seen_at,
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
      isOnline: data.last_seen_at && new Date(data.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000),
    };
  } catch (error) {
    logger.error('FRIENDS_HANDLER', `Error getting user profile: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Register friend management socket event handlers
 */
export function registerFriendsHandlers(io: Server, socket: Socket): void {

  // ==================== Send Friend Request ====================
  socket.on('friends:sendRequest', async (data: { targetUserId: string; targetUsername?: string }) => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.SEND_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated to send friend requests');
      return;
    }

    // Validate input
    if (!data?.targetUserId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Target user ID is required',
      });
      return;
    }

    // Cannot add yourself
    if (data.targetUserId === authUserId) {
      socket.emit('friends:error', {
        code: 'CANNOT_ADD_SELF',
        message: 'Cannot send friend request to yourself',
      });
      return;
    }

    try {
      const result = await friendsManager.sendFriendRequest(authUserId, data.targetUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: result.message || 'Failed to send friend request',
        });
        return;
      }

      // Get profiles for both users
      const fromProfile = await getUserProfile(authUserId);
      const toProfile = await getUserProfile(data.targetUserId);

      if (!fromProfile || !toProfile) {
        socket.emit('friends:error', {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        });
        return;
      }

      // Build request data
      const requestData = {
        requestId: result.request!.requestId,
        fromUserId: authUserId,
        fromUsername: fromProfile.username,
        fromDisplayName: fromProfile.displayName,
        fromAvatar: fromProfile.avatar,
        toUserId: data.targetUserId,
        toUsername: toProfile.username,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      // Notify recipient
      broadcastToUser(io, data.targetUserId, 'friends:requestReceived', requestData);

      // Confirm to sender
      socket.emit('friends:requestSent', requestData);

      logger.info('FRIENDS', `Friend request sent from ${authUserId} to ${data.targetUserId}`);
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error sending friend request: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to send friend request',
      });
    }
  });

  // ==================== Accept Friend Request ====================
  socket.on('friends:acceptRequest', async (data: { requestId: string }) => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.ACCEPT_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
      return;
    }

    if (!data?.requestId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Request ID is required',
      });
      return;
    }

    try {
      const result = await friendsManager.acceptFriendRequest(data.requestId, authUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: 'Failed to accept friend request',
        });
        return;
      }

      // Get the friend request details to notify both users
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      const { data: request } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .eq('id', data.requestId)
        .single();

      if (!request) {
        socket.emit('friends:error', {
          code: 'REQUEST_NOT_FOUND',
          message: 'Friend request not found',
        });
        return;
      }

      const senderId = request.user_id;
      const recipientId = request.friend_id;

      // Get profiles
      const senderProfile = await getUserProfile(senderId);
      const recipientProfile = await getUserProfile(recipientId);

      if (!senderProfile || !recipientProfile) {
        socket.emit('friends:error', {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        });
        return;
      }

      const acceptedData = {
        requestId: data.requestId,
        fromUserId: senderId,
        fromUsername: senderProfile.username,
        fromDisplayName: senderProfile.displayName,
        fromAvatar: senderProfile.avatar,
        toUserId: recipientId,
        toUsername: recipientProfile.username,
        status: 'accepted' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      // Notify sender
      broadcastToUser(io, senderId, 'friends:requestAccepted', acceptedData);

      // Confirm to recipient
      socket.emit('friends:requestAccepted', acceptedData);

      // Notify both about online status if the other is online
      if (senderProfile.isOnline) {
        socket.emit('friends:friendOnline', {
          userId: senderId,
          username: senderProfile.username,
          timestamp: Date.now(),
        });
      }
      if (recipientProfile.isOnline) {
        broadcastToUser(io, senderId, 'friends:friendOnline', {
          userId: recipientId,
          username: recipientProfile.username,
          timestamp: Date.now(),
        });
      }

      logger.info('FRIENDS', `Friend request accepted: ${senderId} <-> ${recipientId}`);
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error accepting friend request: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to accept friend request',
      });
    }
  });

  // ==================== Decline Friend Request ====================
  socket.on('friends:declineRequest', async (data: { requestId: string }) => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.DECLINE_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
      return;
    }

    if (!data?.requestId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Request ID is required',
      });
      return;
    }

    try {
      const result = await friendsManager.declineFriendRequest(data.requestId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to decline friend request',
        });
        return;
      }

      socket.emit('friends:requestDeclined', {
        requestId: data.requestId,
        timestamp: Date.now(),
      });

      logger.info('FRIENDS', `Friend request declined: ${data.requestId}`);
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error declining friend request: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to decline friend request',
      });
    }
  });

  // ==================== Unfriend ====================
  socket.on('friends:unfriend', async (data: { friendUserId: string }) => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.UNFRIEND)) {
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
      const result = await friendsManager.unfriend(authUserId, data.friendUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to unfriend user',
        });
        return;
      }

      // Notify both users
      socket.emit('friends:friendRemoved', {
        friendUserId: data.friendUserId,
        timestamp: Date.now(),
      });

      broadcastToUser(io, data.friendUserId, 'friends:friendRemoved', {
        friendUserId: authUserId,
        timestamp: Date.now(),
      });

      logger.info('FRIENDS', `User ${authUserId} unfriended ${data.friendUserId}`);
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error unfriending user: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to unfriend user',
      });
    }
  });

  // ==================== Search Users ====================
  socket.on('friends:searchUsers', async (data: { query: string; limit?: number }) => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.SEARCH_USERS)) {
      socket.emit('rateLimited');
      return;
    }

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      emitError(socket, 'Must be authenticated');
      return;
    }

    if (!data?.query || data.query.length < 2) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Search query must be at least 2 characters',
      });
      return;
    }

    try {
      const limit = Math.min(data.limit || 20, 50); // Max 50 results
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      // Search by username (case-insensitive)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_emoji, avatar_color, avatar_image')
        .ilike('username', `%${data.query}%`)
        .neq('id', authUserId) // Exclude self
        .limit(limit);

      if (!profiles) {
        socket.emit('friends:searchResults', { users: [], timestamp: Date.now() });
        return;
      }

      // Check friendship status for each user
      const users = await Promise.all(
        profiles.map(async (profile) => {
          const isFriend = await friendsManager.areFriends(authUserId, profile.id);

          // Check if pending request exists
          const { data: pendingRequest } = await supabase
            .from('friends')
            .select('id')
            .eq('status', 'pending')
            .or(`user_id.eq.${authUserId},friend_id.eq.${authUserId}`)
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
            .single();

          return {
            userId: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            avatar: {
              emoji: profile.avatar_emoji || '👤',
              color: profile.avatar_color || '#808080',
              image: profile.avatar_image,
            },
            isFriend,
            isPending: !!pendingRequest,
          };
        })
      );

      socket.emit('friends:searchResults', {
        users,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error searching users: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to search users',
      });
    }
  });

  // ==================== Get Pending Requests ====================
  socket.on('friends:getPendingRequests', async () => {
    if (!checkRateLimit(socket.id, RATE_WEIGHTS.GET_PENDING)) {
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

      // Get sent requests (user_id = authUserId)
      const { data: sent } = await supabase
        .from('friends')
        .select('id, user_id, friend_id, created_at')
        .eq('user_id', authUserId)
        .eq('status', 'pending');

      // Get received requests (friend_id = authUserId)
      const { data: received } = await supabase
        .from('friends')
        .select('id, user_id, friend_id, created_at')
        .eq('friend_id', authUserId)
        .eq('status', 'pending');

      // Populate with profile data
      const sentRequests = await Promise.all(
        (sent || []).map(async (req) => {
          const profile = await getUserProfile(req.friend_id);
          return {
            requestId: req.id,
            fromUserId: req.user_id,
            fromUsername: '',
            fromAvatar: { emoji: '👤', color: '#808080' },
            toUserId: req.friend_id,
            toUsername: profile?.username || '',
            status: 'pending' as const,
            createdAt: new Date(req.created_at).getTime(),
            expiresAt: new Date(req.created_at).getTime() + 30 * 24 * 60 * 60 * 1000,
          };
        })
      );

      const receivedRequests = await Promise.all(
        (received || []).map(async (req) => {
          const profile = await getUserProfile(req.user_id);
          return {
            requestId: req.id,
            fromUserId: req.user_id,
            fromUsername: profile?.username || '',
            fromDisplayName: profile?.displayName,
            fromAvatar: profile?.avatar || { emoji: '👤', color: '#808080' },
            toUserId: req.friend_id,
            toUsername: '',
            status: 'pending' as const,
            createdAt: new Date(req.created_at).getTime(),
            expiresAt: new Date(req.created_at).getTime() + 30 * 24 * 60 * 60 * 1000,
          };
        })
      );

      socket.emit('friends:pendingRequests', {
        sent: sentRequests,
        received: receivedRequests,
      });
    } catch (error) {
      logger.error('FRIENDS_HANDLER', `Error getting pending requests: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to get pending requests',
      });
    }
  });
}
