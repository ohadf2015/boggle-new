/**
 * Friends Challenges Module
 * Handles challenge sending, accepting, declining, and expiration
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type { Challenge } from '@/shared/types/friends';
import { areFriends } from './friendsManager';

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
    const isFriend = await areFriends(challengerId, challengedId);
    if (!isFriend) {
      return { success: false, errorCode: 'NOT_FRIENDS' };
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

    const { data: received } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const { data: sent } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenger_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

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
