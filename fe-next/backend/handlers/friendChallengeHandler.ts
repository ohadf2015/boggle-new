/**
 * Friend Challenge Handler
 * Handles game challenge invites between friends
 */

import type { Server, Socket } from 'socket.io';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as friendsManager from '../modules/friendsManager';
import { notifyGameInvite, notifyChallengeAccepted, notifyChallengeDeclined } from '../modules/pushNotificationTriggers';
import { getSupabase } from '../modules/supabaseServer';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../utils/socialHelpers';

// Rate limit weights
const RATE_WEIGHTS = {
  SEND_CHALLENGE: 2, // Prevent spam invites
  ACCEPT_CHALLENGE: 1,
  DECLINE_CHALLENGE: 1,
  GET_CHALLENGES: 1,
  CANCEL_CHALLENGE: 1,
};

/**
 * Generate a unique game room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Register friend challenge socket event handlers
 */
export function registerFriendChallengeHandlers(io: Server, socket: Socket): void {

  // ==================== Send Challenge ====================
  socket.on('friends:sendChallenge', async (data: {
    friendUserId: string;
    challengeType: 'new_game' | 'join_room';
    roomCode?: string;
    gameSettings?: {
      language?: string;
      timerSeconds?: number;
      mode?: string;
    };
    message?: string;
  }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.SEND_CHALLENGE)) {
      socket.emit('rateLimited');
      return;
    }
    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED, { message: 'Must be authenticated to send challenges' });
      return;
    }

    // Validate input
    if (!data?.friendUserId || !data?.challengeType) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Friend user ID and challenge type are required',
      });
      return;
    }

    if (data.challengeType === 'join_room' && !data.roomCode) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Room code is required for join_room challenges',
      });
      return;
    }

    try {
      // Generate or use provided room code
      const roomCode = data.challengeType === 'new_game'
        ? generateRoomCode()
        : data.roomCode!;

      // Send challenge via manager
      const result = await friendsManager.sendChallenge(
        authUserId,
        data.friendUserId,
        {
          challengeId: roomCode,
          challengeType: data.challengeType,
          gameSettings: data.gameSettings,
          message: data.message,
        }
      );

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: 'Failed to send challenge',
        });
        return;
      }

      // Get profiles for both users
      const fromProfile = await getUserProfile(authUserId);
      const toProfile = await getUserProfile(data.friendUserId);

      if (!fromProfile || !toProfile) {
        socket.emit('friends:error', {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        });
        return;
      }

      // Build challenge data
      const challengeData = {
        challengeId: result.challenge!.challengeId,
        fromUserId: authUserId,
        fromUsername: fromProfile.username,
        fromDisplayName: fromProfile.displayName,
        fromAvatar: fromProfile.avatar,
        toUserId: data.friendUserId,
        toUsername: toProfile.username,
        challengeType: data.challengeType,
        roomCode,
        gameSettings: data.gameSettings,
        message: data.message,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // Notify recipient via Socket.IO (online) + push (offline)
      broadcastToUser(io, data.friendUserId, 'friends:challengeReceived', challengeData);
      notifyGameInvite(data.friendUserId, fromProfile.displayName || fromProfile.username, roomCode, authUserId).catch(() => {});

      // Confirm to sender
      socket.emit('friends:challengeSent', challengeData);

      logger.info('CHALLENGE', `Challenge sent from ${authUserId} to ${data.friendUserId} (type: ${data.challengeType})`);
    } catch (error) {
      logger.error('CHALLENGE_HANDLER', `Error sending challenge: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to send challenge',
      });
    }
  });

  // ==================== Accept Challenge ====================
  socket.on('friends:acceptChallenge', async (data: { challengeId: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.ACCEPT_CHALLENGE)) {
      socket.emit('rateLimited');
      return;
    }
    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.challengeId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Challenge ID is required',
      });
      return;
    }

    try {
      const result = await friendsManager.acceptChallenge(data.challengeId, authUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: result.errorCode || 'SERVER_ERROR',
          message: 'Failed to accept challenge',
        });
        return;
      }

      // Get challenge details to notify challenger
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      const { data: challenge } = await supabase
        .from('friend_challenges')
        .select('*')
        .eq('id', data.challengeId)
        .single();

      if (!challenge) {
        socket.emit('friends:error', {
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Challenge not found',
        });
        return;
      }

      // Get profiles
      const challengerProfile = await getUserProfile(challenge.challenger_id);
      const challengedProfile = await getUserProfile(challenge.challenged_id);

      if (!challengerProfile || !challengedProfile) {
        socket.emit('friends:error', {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        });
        return;
      }

      const acceptedData = {
        challengeId: data.challengeId,
        fromUserId: challenge.challenger_id,
        fromUsername: challengerProfile.username,
        fromDisplayName: challengerProfile.displayName,
        fromAvatar: challengerProfile.avatar,
        toUserId: challenge.challenged_id,
        toUsername: challengedProfile.username,
        challengeType: challenge.challenge_type as 'new_game' | 'join_room',
        roomCode: result.roomCode!,
        status: 'accepted' as const,
        createdAt: new Date(challenge.created_at).getTime(),
        expiresAt: new Date(challenge.expires_at).getTime(),
      };

      // Notify challenger via Socket.IO + push (N-3)
      broadcastToUser(io, challenge.challenger_id, 'friends:challengeAccepted', acceptedData);
      notifyChallengeAccepted(
        challenge.challenger_id,
        challengedProfile.displayName || challengedProfile.username,
        result.roomCode!,
        authUserId
      ).catch(() => {});

      // Confirm to challenged user with room code
      socket.emit('friends:challengeAccepted', acceptedData);

      logger.info('CHALLENGE', `Challenge accepted: ${data.challengeId} by ${authUserId}`);
    } catch (error) {
      logger.error('CHALLENGE_HANDLER', `Error accepting challenge: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to accept challenge',
      });
    }
  });

  // ==================== Decline Challenge ====================
  socket.on('friends:declineChallenge', async (data: { challengeId: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.DECLINE_CHALLENGE)) {
      socket.emit('rateLimited');
      return;
    }
    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.challengeId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Challenge ID is required',
      });
      return;
    }

    try {
      // Get challenge details before declining
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      const { data: challenge } = await supabase
        .from('friend_challenges')
        .select('challenger_id, challenged_id')
        .eq('id', data.challengeId)
        .single();

      if (!challenge) {
        socket.emit('friends:error', {
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Challenge not found',
        });
        return;
      }

      const result = await friendsManager.declineChallenge(data.challengeId, authUserId);

      if (!result.success) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to decline challenge',
        });
        return;
      }

      // Get profiles
      const challengerProfile = await getUserProfile(challenge.challenger_id);
      const challengedProfile = await getUserProfile(challenge.challenged_id);

      if (!challengerProfile || !challengedProfile) {
        socket.emit('friends:error', {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        });
        return;
      }

      const declinedData = {
        challengeId: data.challengeId,
        fromUserId: challenge.challenger_id,
        fromUsername: challengerProfile.username,
        toUserId: challenge.challenged_id,
        toUsername: challengedProfile.username,
        status: 'declined' as const,
        timestamp: Date.now(),
      };

      // Notify challenger via Socket.IO + push (N-4)
      broadcastToUser(io, challenge.challenger_id, 'friends:challengeDeclined', declinedData);
      notifyChallengeDeclined(
        challenge.challenger_id,
        challengedProfile?.displayName || challengedProfile?.username || '',
        authUserId
      ).catch(() => {});

      // Confirm to challenged user
      socket.emit('friends:challengeDeclined', declinedData);

      logger.info('CHALLENGE', `Challenge declined: ${data.challengeId} by ${authUserId}`);
    } catch (error) {
      logger.error('CHALLENGE_HANDLER', `Error declining challenge: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to decline challenge',
      });
    }
  });

  // ==================== Get Pending Challenges ====================
  socket.on('friends:getPendingChallenges', async () => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.GET_CHALLENGES)) {
      socket.emit('rateLimited');
      return;
    }
    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    try {
      const result = await friendsManager.getPendingChallenges(authUserId);

      // Enrich with profile data
      const sent = await Promise.all(
        result.sent.map(async (challenge) => {
          try {
            const toProfile = await getUserProfile(challenge.toUserId);
            return {
              ...challenge,
              toUsername: toProfile?.username || '',
              fromAvatar: (await getUserProfile(challenge.fromUserId))?.avatar || { emoji: '👤', color: '#808080' },
            };
          } catch {
            return { ...challenge, toUsername: '', fromAvatar: { emoji: '👤', color: '#808080' } };
          }
        })
      );

      const received = await Promise.all(
        result.received.map(async (challenge) => {
          try {
            const fromProfile = await getUserProfile(challenge.fromUserId);
            return {
              ...challenge,
              fromUsername: fromProfile?.username || '',
              fromDisplayName: fromProfile?.displayName,
              fromAvatar: fromProfile?.avatar || { emoji: '👤', color: '#808080' },
            };
          } catch {
            return { ...challenge, fromUsername: '', fromDisplayName: undefined, fromAvatar: { emoji: '👤', color: '#808080' } };
          }
        })
      );

      socket.emit('friends:pendingChallenges', {
        sent,
        received,
      });
    } catch (error) {
      logger.error('CHALLENGE_HANDLER', `Error getting pending challenges: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to get pending challenges',
      });
    }
  });

  // ==================== Cancel Challenge ====================
  socket.on('friends:cancelChallenge', async (data: { challengeId: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.CANCEL_CHALLENGE)) {
      socket.emit('rateLimited');
      return;
    }
    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.challengeId) {
      socket.emit('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Challenge ID is required',
      });
      return;
    }

    try {
      // Verify user is the challenger
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Database unavailable',
        });
        return;
      }

      const { data: challenge } = await supabase
        .from('friend_challenges')
        .select('*')
        .eq('id', data.challengeId)
        .eq('challenger_id', authUserId)
        .eq('status', 'pending')
        .single();

      if (!challenge) {
        socket.emit('friends:error', {
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Challenge not found or already completed',
        });
        return;
      }

      // Delete the challenge
      const { error } = await supabase
        .from('friend_challenges')
        .delete()
        .eq('id', data.challengeId);

      if (error) {
        logger.error('CHALLENGE_HANDLER', `Error canceling challenge: ${error.message}`);
        socket.emit('friends:error', {
          code: 'SERVER_ERROR',
          message: 'Failed to cancel challenge',
        });
        return;
      }

      // Notify challenged user
      broadcastToUser(io, challenge.challenged_id, 'friends:challengeExpired', {
        challengeId: data.challengeId,
        timestamp: Date.now(),
      });

      // Confirm to challenger
      socket.emit('friends:challengeExpired', {
        challengeId: data.challengeId,
        timestamp: Date.now(),
      });

      logger.info('CHALLENGE', `Challenge canceled: ${data.challengeId} by ${authUserId}`);
    } catch (error) {
      logger.error('CHALLENGE_HANDLER', `Error canceling challenge: ${(error as Error).message}`);
      socket.emit('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to cancel challenge',
      });
    }
  });
}
