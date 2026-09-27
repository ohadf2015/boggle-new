/**
 * Friends Challenges Module
 * Handles challenge sending, accepting, declining, and expiration
 */

import type { Server } from 'socket.io';

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type { Challenge } from '@/shared/types/friends';
import { areFriends } from './friendsManager';
import { broadcastToUser } from '../utils/socialHelpers';
import { notifyChallengeResult } from './pushNotificationTriggers';

/**
 * Helper to map a challenge DB row to Challenge type
 */
function mapChallengeRow(c: Record<string, unknown>): Challenge {
  return {
    challengeId: c.id as string,
    fromUserId: c.challenger_id as string,
    toUserId: c.challenged_id as string,
    fromUsername: '',
    toUsername: '',
    fromAvatar: { emoji: '\u{1F464}', color: '#808080' },
    challengeType: c.challenge_type as 'new_game' | 'join_room',
    roomCode: c.challenge_id as string,
    message: c.message as string | undefined,
    status: 'pending',
    createdAt: new Date(c.created_at as string).getTime(),
    expiresAt: new Date(c.expires_at as string).getTime(),
  };
}

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
    if (challengerId === challengedId) {
      return { success: false, errorCode: 'CANNOT_CHALLENGE_SELF' };
    }

    const isFriend = await areFriends(challengerId, challengedId);
    if (!isFriend) {
      return { success: false, errorCode: 'NOT_FRIENDS' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    // Guard against duplicate/spammed invites: one live pending challenge per
    // (challenger -> challenged) pair. No DB unique constraint exists, so a
    // double-click would otherwise insert N pending rows.
    const { data: existingPending } = await supabase
      .from('friend_challenges')
      .select('id')
      .eq('challenger_id', challengerId)
      .eq('challenged_id', challengedId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return { success: false, errorCode: 'CHALLENGE_ALREADY_SENT' };
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
        timer_seconds: challengeData.gameSettings?.timerSeconds,
      })
      .select()
      .single();

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error sending challenge: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    return {
      success: true,
      challenge: {
        challengeId: data.id,
        fromUserId: challengerId,
        toUserId: challengedId,
        fromUsername: '',
        toUsername: '',
        fromAvatar: { emoji: '\u{1F464}', color: '#808080' },
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
    return { success: false, errorCode: 'SERVER_ERROR' };
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

    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .single();

    if (!challenge) {
      return { success: false, errorCode: 'CHALLENGE_NOT_FOUND' };
    }

    if (new Date(challenge.expires_at) < new Date()) {
      return { success: false, errorCode: 'CHALLENGE_EXPIRED' };
    }

    const { error } = await supabase
      .from('friend_challenges')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', challengeId);

    if (error) {
      logger.error('FRIENDS_MANAGER', `Error accepting challenge: ${error.message}`);
      return { success: false, errorCode: 'SERVER_ERROR' };
    }

    return { success: true, roomCode: challenge.challenge_id };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception accepting challenge: ${(error as Error).message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
}

/**
 * Decline a challenge (only the challenged party can decline)
 */
export async function declineChallenge(challengeId: string, userId: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('FRIENDS_MANAGER', 'Supabase client not available');
      return { success: false };
    }

    // Enforce that only the challenged party can decline (F-2)
    const { error } = await supabase
      .from('friend_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId)
      .eq('challenged_id', userId)
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

    const { data: received } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: sent } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenger_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      sent: (sent || []).map(c => mapChallengeRow(c)),
      received: (received || []).map(c => mapChallengeRow(c)),
    };
  } catch (error) {
    logger.error('FRIENDS_MANAGER', `Exception getting pending challenges: ${(error as Error).message}`);
    return { sent: [], received: [] };
  }
}

/**
 * After a multiplayer game ends, detect whether the room was an accepted
 * friend challenge and, if so, broadcast a `friends:challengeResult` event to
 * both players plus a push notification. Without this, recipients only ever
 * saw the live MP results screen — they had no surface in /friends or via
 * push to know the match was complete.
 *
 * Safe to call for every game end: returns silently when no row matches.
 */
interface CompletionGameLike {
  users?: Record<string, { authUserId?: string | null; username?: string; isBot?: boolean }>;
  playerScores?: Record<string, number>;
}

export async function processFriendChallengeCompletion(
  io: Server,
  gameCode: string,
  game: CompletionGameLike,
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: row } = await supabase
      .from('friend_challenges')
      .select('id, challenger_id, challenged_id, status')
      .eq('challenge_id', gameCode)
      .eq('status', 'accepted')
      .single();

    if (!row) return;

    // Build authUserId-keyed scores, skipping bots and unauthenticated guests.
    const scores: Record<string, number> = {};
    const usernameByUserId: Record<string, string> = {};
    for (const [username, user] of Object.entries(game.users ?? {})) {
      if (user?.isBot) continue;
      const authUserId = user?.authUserId;
      if (!authUserId) continue;
      scores[authUserId] = game.playerScores?.[username] ?? 0;
      usernameByUserId[authUserId] = user?.username ?? username;
    }

    // Determine winner: highest score; tie ⇒ null.
    let winnerUserId: string | null = null;
    const entries = Object.entries(scores);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      const [topId, topScore] = entries[0];
      const second = entries[1];
      winnerUserId = second && second[1] === topScore ? null : topId;
    }

    await supabase
      .from('friend_challenges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    const payload = {
      challengeId: row.id as string,
      gameCode,
      winnerUserId,
      scores,
      timestamp: Date.now(),
    };

    const recipients = [row.challenger_id as string, row.challenged_id as string];
    for (const userId of recipients) {
      try {
        broadcastToUser(io, userId, 'friends:challengeResult', payload);
      } catch (err) {
        logger.warn('CHALLENGE', `Failed to broadcast result to ${userId}: ${(err as Error).message}`);
      }
      const opponentUserId = userId === row.challenger_id ? row.challenged_id : row.challenger_id;
      const opponentUsername = usernameByUserId[opponentUserId as string] ?? 'a friend';
      const didWin = winnerUserId === userId;
      const isTie = winnerUserId === null;
      try {
        await notifyChallengeResult(
          userId,
          opponentUsername,
          didWin ? 'win' : isTie ? 'tie' : 'loss',
          row.id as string,
        );
      } catch (err) {
        logger.warn('CHALLENGE', `Failed to send result push to ${userId}: ${(err as Error).message}`);
      }
    }

    logger.info('CHALLENGE', `Challenge ${row.id} completed (game ${gameCode}); winner=${winnerUserId ?? 'tie'}`);
  } catch (error) {
    logger.error('CHALLENGE', `processFriendChallengeCompletion failed for ${gameCode}: ${(error as Error).message}`);
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
