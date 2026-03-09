/**
 * Push Notification Triggers
 * Maps game events to push notification sends + notification history
 * Fire-and-forget — never blocks the calling handler
 */

import logger from '../utils/logger';
import { sendToUser } from './fcmService';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { FCMPayload } from './fcmService';

export type PushNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'turn_reminder'
  | 'achievement'
  | 'daily_challenge';

/**
 * Save notification to user_notifications table for in-app history
 */
async function saveNotificationHistory(
  userId: string,
  type: string,
  payload: FCMPayload,
  deepLink?: string,
  senderId?: string
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    const { error } = await supabase.from('user_notifications').insert({
      user_id: userId,
      notification_type: type === 'friend_request' || type === 'friend_accepted' ? 'social' : 'system',
      title: payload.title,
      body: payload.body,
      action_url: deepLink,
      push_sent: true,
      push_sent_at: new Date().toISOString(),
      ...(senderId && { sender_id: senderId }),
    });

    if (error) {
      logger.warn('PUSH_TRIGGER', `Failed to save notification history: ${error.message}`);
    }
  } catch (error) {
    logger.error('PUSH_TRIGGER', `Error saving notification history: ${(error as Error).message}`);
  }
}

/**
 * Send push + save history (fire-and-forget wrapper)
 */
async function triggerPush(
  userId: string,
  type: PushNotificationType,
  payload: FCMPayload,
  senderId?: string
): Promise<void> {
  try {
    await Promise.allSettled([
      sendToUser(userId, payload),
      saveNotificationHistory(userId, type, payload, payload.data?.deepLink, senderId),
    ]);
  } catch (error) {
    logger.error('PUSH_TRIGGER', `Trigger failed for ${type}: ${(error as Error).message}`);
  }
}

/**
 * Notify user of incoming friend request
 */
export async function notifyFriendRequest(
  toUserId: string,
  fromUsername: string,
  fromUserId?: string
): Promise<void> {
  return triggerPush(toUserId, 'friend_request', {
    title: 'Friend Request',
    body: `${fromUsername} sent you a friend request!`,
    data: {
      type: 'friend_request',
      deepLink: '/adventure?tab=friends',
    },
  }, fromUserId);
}

/**
 * Notify user their friend request was accepted
 */
export async function notifyFriendAccepted(
  toUserId: string,
  acceptorUsername: string,
  acceptorUserId?: string
): Promise<void> {
  return triggerPush(toUserId, 'friend_accepted', {
    title: 'Friend Request Accepted',
    body: `${acceptorUsername} accepted your friend request!`,
    data: {
      type: 'friend_accepted',
      deepLink: '/adventure?tab=friends',
    },
  }, acceptorUserId);
}

/**
 * Notify user of a game invite
 */
export async function notifyGameInvite(
  toUserId: string,
  inviterUsername: string,
  roomCode: string,
  inviterUserId?: string
): Promise<void> {
  return triggerPush(toUserId, 'game_invite', {
    title: 'Game Invite',
    body: `${inviterUsername} invited you to play!`,
    data: {
      type: 'game_invite',
      deepLink: `/join/${roomCode}`,
    },
  }, inviterUserId);
}

/**
 * Notify user it's their turn (async multiplayer)
 */
export async function notifyTurnReminder(
  toUserId: string,
  opponentUsername: string,
  roomCode: string
): Promise<void> {
  return triggerPush(toUserId, 'turn_reminder', {
    title: 'Your Turn!',
    body: `${opponentUsername} played — your turn now!`,
    data: {
      type: 'turn_reminder',
      deepLink: `/join/${roomCode}`,
    },
  });
}

/**
 * Notify user of an achievement unlock
 */
export async function notifyAchievement(
  toUserId: string,
  achievementName: string
): Promise<void> {
  return triggerPush(toUserId, 'achievement', {
    title: 'Achievement Unlocked!',
    body: `You earned: ${achievementName}`,
    data: {
      type: 'achievement',
      deepLink: '/adventure/achievements',
    },
  });
}
