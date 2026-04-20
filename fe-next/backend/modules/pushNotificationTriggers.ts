/**
 * Push Notification Triggers
 * Maps game events to push notification sends + notification history
 * Fire-and-forget — never blocks the calling handler
 */

import logger from '../utils/logger';
import { sendToUser, type FCMPayload } from './fcmService';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type PushNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'turn_reminder'
  | 'achievement'
  | 'daily_challenge'
  | 'direct_message'
  | 'challenge_accepted'
  | 'challenge_declined'
  | 'gift_received'
  | 'level_up';

/**
 * Map push types to notification_type for user_notifications table (N-7)
 */
const NOTIFICATION_TYPE_MAP: Record<PushNotificationType, string> = {
  friend_request: 'social',
  friend_accepted: 'social',
  game_invite: 'social',
  direct_message: 'social',
  challenge_accepted: 'social',
  challenge_declined: 'social',
  gift_received: 'social',
  turn_reminder: 'social',
  achievement: 'achievement',
  daily_challenge: 'system',
  level_up: 'achievement',
};

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
    if (!supabase) return;

    const { error } = await supabase.from('user_notifications').insert({
      user_id: userId,
      notification_type: NOTIFICATION_TYPE_MAP[type as PushNotificationType] || 'system',
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

/**
 * Notify user of a new direct message (N-1)
 */
export async function notifyDirectMessage(
  toUserId: string,
  fromUsername: string,
  messagePreview: string,
  fromUserId?: string
): Promise<void> {
  const preview = messagePreview.length > 50
    ? messagePreview.substring(0, 47) + '...'
    : messagePreview;

  return triggerPush(toUserId, 'direct_message', {
    title: `Message from ${fromUsername}`,
    body: preview,
    data: {
      type: 'direct_message',
      deepLink: '/friends?tab=messages',
    },
  }, fromUserId);
}

/**
 * Notify challenger that their challenge was accepted (N-3)
 */
export async function notifyChallengeAccepted(
  toUserId: string,
  acceptorUsername: string,
  roomCode: string,
  acceptorUserId?: string
): Promise<void> {
  return triggerPush(toUserId, 'challenge_accepted', {
    title: 'Challenge Accepted!',
    body: `${acceptorUsername} accepted your challenge — join now!`,
    data: {
      type: 'challenge_accepted',
      deepLink: `/join/${roomCode}`,
    },
  }, acceptorUserId);
}

/**
 * Notify challenger that their challenge was declined (N-4)
 */
export async function notifyChallengeDeclined(
  toUserId: string,
  declinerUsername: string,
  declinerUserId?: string
): Promise<void> {
  return triggerPush(toUserId, 'challenge_declined', {
    title: 'Challenge Declined',
    body: `${declinerUsername} declined your challenge`,
    data: {
      type: 'challenge_declined',
      deepLink: '/friends',
    },
  }, declinerUserId);
}

/**
 * Notify user they received a gift (N-1 gap / E-7)
 */
export async function notifyGiftReceived(
  toUserId: string,
  senderUsername: string,
  giftType: string,
  senderId?: string
): Promise<void> {
  const giftLabels: Record<string, string> = {
    hints: 'a hint',
    streak_freeze: 'a streak freeze',
    coins: 'coins',
  };
  const label = giftLabels[giftType] || giftType;

  return triggerPush(toUserId, 'gift_received', {
    title: 'Gift Received!',
    body: `${senderUsername} sent you ${label}!`,
    data: {
      type: 'gift_received',
      deepLink: '/friends',
    },
  }, senderId);
}

/**
 * Remind user to complete today's daily challenge (server-side cron)
 * Only called for users who haven't played today (gate enforced by cron query)
 */
export async function notifyDailyChallengeReminder(
  toUserId: string
): Promise<void> {
  return triggerPush(toUserId, 'daily_challenge', {
    title: '🎯 Daily Challenge awaits',
    body: 'Keep your streak alive — 60 seconds to play!',
    data: {
      type: 'daily_challenge',
      deepLink: '/daily-challenge',
    },
  });
}

/**
 * Notify user of a level up (N-11)
 */
export async function notifyLevelUp(
  toUserId: string,
  newLevel: number
): Promise<void> {
  return triggerPush(toUserId, 'level_up', {
    title: `Level ${newLevel}!`,
    body: `Congratulations — you reached level ${newLevel}!`,
    data: {
      type: 'level_up',
      deepLink: '/adventure',
    },
  });
}
