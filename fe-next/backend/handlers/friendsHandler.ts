/**
 * Friends Handler
 * Handles friend management socket events (add, accept, decline, unfriend, search)
 */

import type { Server, Socket } from 'socket.io';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as friendsManager from '../modules/friendsManager';
import { getSupabase } from '../modules/supabaseServer';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../utils/socialHelpers';
import { ensureSocialCapability } from '../utils/socialPolicyServer';
import { notifyFriendRequest, notifyFriendAccepted } from '../modules/pushNotificationTriggers';

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
 * Register friend management socket event handlers
 */
export function registerFriendsHandlers(io: Server, socket: Socket): void {

  // ==================== Send Friend Request ====================
  socket.on('friends:sendRequest', async (data: { targetUserId: string; targetUsername?: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.SEND_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED, { message: 'Must be authenticated to send friend requests' });
      return;
    }

    // Families Policy: acquiring new contacts (friend requests) is gated for
    // child / unknown-age users — open username search is not a "known contact".
    if (!(await ensureSocialCapability(socket, 'friendManagement'))) {
      emitError(socket, ErrorCodes.SOCIAL_RESTRICTED, { message: 'Adding friends is turned off for this account' });
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

      // Notify recipient via Socket.IO (online) + push (offline)
      broadcastToUser(io, data.targetUserId, 'friends:requestReceived', requestData);
      notifyFriendRequest(data.targetUserId, fromProfile.username, authUserId).catch(() => {});

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
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.ACCEPT_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
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

      // Notify sender via Socket.IO (online) + push (offline)
      broadcastToUser(io, senderId, 'friends:requestAccepted', acceptedData);
      notifyFriendAccepted(senderId, recipientProfile.username, recipientId).catch(() => {});

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
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.DECLINE_REQUEST)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
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
      // Pass authUserId so the manager verifies the decliner is the recipient
      const result = await friendsManager.declineFriendRequest(data.requestId, authUserId);

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
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.UNFRIEND)) {
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
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.SEARCH_USERS)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    // Families Policy: user search (stranger discovery) is gated for child /
    // unknown-age users — prevents acquiring unknown contacts.
    if (!(await ensureSocialCapability(socket, 'friendManagement'))) {
      emitError(socket, ErrorCodes.SOCIAL_RESTRICTED, { message: 'Searching for players is turned off for this account' });
      return;
    }

    if (!data?.query || data.query.length < 2 || data.query.length > 50) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Search query must be 2-50 characters',
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

      if (!profiles || profiles.length === 0) {
        socket.emit('friends:searchResults', { users: [], timestamp: Date.now() });
        return;
      }

      // Batch fetch ALL friendship rows involving authUserId in a single query
      const profileIds = profiles.map((p) => p.id);
      const { data: friendshipRows } = await supabase
        .from('friends')
        .select('id, user_id, friend_id, status')
        .or(
          profileIds
            .map(
              (pid) =>
                `and(user_id.eq.${authUserId},friend_id.eq.${pid}),and(user_id.eq.${pid},friend_id.eq.${authUserId})`
            )
            .join(',')
        );

      // Build lookup map: otherUserId -> { isFriend, isPending }
      type FriendshipStatus = { isFriend: boolean; isPending: boolean };
      const statusMap = new Map<string, FriendshipStatus>();

      for (const row of friendshipRows || []) {
        const otherId = row.user_id === authUserId ? row.friend_id : row.user_id;
        const isFriend = row.status === 'accepted';
        const isPending = row.status === 'pending';
        statusMap.set(otherId, { isFriend, isPending });
      }

      const users = profiles.map((profile) => {
        const status = statusMap.get(profile.id);
        return {
          userId: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatar: {
            emoji: profile.avatar_emoji || '👤',
            color: profile.avatar_color || '#808080',
            image: profile.avatar_image,
          },
          isFriend: status?.isFriend ?? false,
          isPending: status?.isPending ?? false,
        };
      });

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
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.GET_PENDING)) {
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

      // Fetch sent + received in parallel (2 queries instead of sequential)
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase
          .from('friends')
          .select('id, user_id, friend_id, created_at')
          .eq('user_id', authUserId)
          .eq('status', 'pending'),
        supabase
          .from('friends')
          .select('id, user_id, friend_id, created_at')
          .eq('friend_id', authUserId)
          .eq('status', 'pending'),
      ]);

      // Batch-fetch all needed profiles in ONE query instead of N+1
      const profileIds = new Set<string>();
      (sent || []).forEach((req) => profileIds.add(req.friend_id));
      (received || []).forEach((req) => profileIds.add(req.user_id));

      const profileMap = new Map<string, { username: string; display_name: string; avatar_emoji: string; avatar_color: string; avatar_image: string | null }>();
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_emoji, avatar_color, avatar_image')
          .in('id', Array.from(profileIds));
        for (const p of profiles || []) {
          profileMap.set(p.id, p);
        }
      }

      const sentRequests = (sent || []).map((req) => {
        const profile = profileMap.get(req.friend_id);
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
      });

      const receivedRequests = (received || []).map((req) => {
        const profile = profileMap.get(req.user_id);
        return {
          requestId: req.id,
          fromUserId: req.user_id,
          fromUsername: profile?.username || '',
          fromDisplayName: profile?.display_name,
          fromAvatar: profile
            ? { emoji: profile.avatar_emoji || '👤', color: profile.avatar_color || '#808080', image: profile.avatar_image }
            : { emoji: '👤', color: '#808080' },
          toUserId: req.friend_id,
          toUsername: '',
          status: 'pending' as const,
          createdAt: new Date(req.created_at).getTime(),
          expiresAt: new Date(req.created_at).getTime() + 30 * 24 * 60 * 60 * 1000,
        };
      });

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
