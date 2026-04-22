/**
 * Push Notification Triggers
 * Maps game events to push notification sends + notification history
 * Fire-and-forget — never blocks the calling handler
 */

import logger from '../utils/logger';
import { translatePush, type PushLocale, isPushLocale } from '../utils/pushTranslations';
import { sendToUser, type FCMPayload } from './fcmService';
import { mascotImageUrl } from '../services/pushNotificationService';
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
 * Look up recipient's preferred locale from profiles.language.
 * Fail-open to 'en' — missing locale must not block delivery.
 */
export async function getUserLocale(userId: string): Promise<PushLocale> {
  try {
    if (!isSupabaseConfigured()) return 'en';
    const supabase = getSupabase();
    if (!supabase) return 'en';

    const { data, error } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return 'en';
    return isPushLocale(data.language) ? data.language : 'en';
  } catch {
    return 'en';
  }
}

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
 * Delivery mode per notification-policy matrix:
 *  - 'both': relational + time-sensitive (push + in-app row)
 *  - 'push_only': scheduled nudge, no in-app surface after open (daily reminder)
 *  - 'in_app_only': self-generated celebration / low-value alert (achievement, level-up, challenge declined)
 */
type DeliveryMode = 'both' | 'push_only' | 'in_app_only';

/**
 * Map push types → user preference category. Unmapped types (achievement,
 * level_up) are master-gated only.
 */
type PreferenceCategory =
  | 'daily_challenge'
  | 'streak_warning'
  | 'friend_invites'
  | 'weekly_summary';

const CATEGORY_MAP: Partial<Record<PushNotificationType, PreferenceCategory>> = {
  daily_challenge: 'daily_challenge',
  friend_request: 'friend_invites',
  friend_accepted: 'friend_invites',
  game_invite: 'friend_invites',
  challenge_accepted: 'friend_invites',
  challenge_declined: 'friend_invites',
  gift_received: 'friend_invites',
  direct_message: 'friend_invites',
  turn_reminder: 'friend_invites',
};

/**
 * Returns true if push should be sent for this (user, type). Loads row from
 * user_notification_preferences; missing row = defaults (all on except
 * weekly_summary). Fail-open on query errors — we'd rather deliver than drop.
 */
export async function isPushAllowed(
  userId: string,
  type: PushNotificationType
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) return true;
    const supabase = getSupabase();
    if (!supabase) return true;

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('push_enabled, daily_challenge, streak_warning, friend_invites, weekly_summary')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('PUSH_TRIGGER', `Preference lookup failed, allowing send: ${error.message}`);
      return true;
    }

    if (!data) return true; // no row → defaults (all on)

    if (data.push_enabled === false) return false;

    const category = CATEGORY_MAP[type];
    if (!category) return true; // unmapped type → master-only

    return data[category] !== false;
  } catch (error) {
    logger.error('PUSH_TRIGGER', `isPushAllowed error: ${(error as Error).message}`);
    return true;
  }
}

async function triggerPush(
  userId: string,
  type: PushNotificationType,
  payload: FCMPayload,
  mode: DeliveryMode = 'both',
  senderId?: string
): Promise<void> {
  try {
    const jobs: Promise<unknown>[] = [];
    if (mode !== 'in_app_only') {
      const allowed = await isPushAllowed(userId, type);
      if (allowed) jobs.push(sendToUser(userId, payload));
    }
    if (mode !== 'push_only') {
      jobs.push(saveNotificationHistory(userId, type, payload, payload.data?.deepLink, senderId));
    }
    await Promise.allSettled(jobs);
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
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'friend_request', {
    title: translatePush(locale, 'friendRequest.title'),
    body: translatePush(locale, 'friendRequest.body', { sender: fromUsername }),
    imageUrl: mascotImageUrl('waving'),
    data: {
      type: 'friend_request',
      deepLink: '/friends?tab=requests',
    },
  }, 'both', fromUserId);
}

/**
 * Notify user their friend request was accepted
 */
export async function notifyFriendAccepted(
  toUserId: string,
  acceptorUsername: string,
  acceptorUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'friend_accepted', {
    title: translatePush(locale, 'friendAccepted.title'),
    body: translatePush(locale, 'friendAccepted.body', { sender: acceptorUsername }),
    imageUrl: mascotImageUrl('waving'),
    data: {
      type: 'friend_accepted',
      deepLink: '/friends?tab=friends',
    },
  }, 'both', acceptorUserId);
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
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'game_invite', {
    title: translatePush(locale, 'gameInvite.title'),
    body: translatePush(locale, 'gameInvite.body', { sender: inviterUsername }),
    imageUrl: mascotImageUrl('play'),
    data: {
      type: 'game_invite',
      deepLink: `/join/${roomCode}`,
    },
  }, 'both', inviterUserId);
}

/**
 * Notify user it's their turn (async multiplayer)
 */
export async function notifyTurnReminder(
  toUserId: string,
  opponentUsername: string,
  roomCode: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'turn_reminder', {
    title: translatePush(locale, 'turnReminder.title'),
    body: translatePush(locale, 'turnReminder.body', { opponent: opponentUsername }),
    imageUrl: mascotImageUrl('encouraging'),
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
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'achievement', {
    title: translatePush(locale, 'achievement.title'),
    body: translatePush(locale, 'achievement.body', { name: achievementName }),
    imageUrl: mascotImageUrl('mindblown'),
    data: {
      type: 'achievement',
      deepLink: '/adventure/achievements',
    },
  }, 'both');
}

/**
 * Notify user of a new direct message (N-1)
 */
export async function notifyDirectMessage(
  toUserId: string,
  fromUsername: string,
  messagePreview: string,
  fromUserId?: string,
  modeOverride?: 'both' | 'in_app_only'
): Promise<void> {
  const preview = messagePreview.length > 50
    ? messagePreview.substring(0, 47) + '...'
    : messagePreview;

  const deepLink = fromUserId
    ? `/friends?tab=messages&friendUserId=${fromUserId}`
    : '/friends?tab=messages';

  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'direct_message', {
    title: translatePush(locale, 'directMessage.title', { sender: fromUsername }),
    body: translatePush(locale, 'directMessage.body', { preview }),
    imageUrl: mascotImageUrl('spectating'),
    data: {
      type: 'direct_message',
      deepLink,
    },
  }, modeOverride ?? 'both', fromUserId);
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
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'challenge_accepted', {
    title: translatePush(locale, 'challengeAccepted.title'),
    body: translatePush(locale, 'challengeAccepted.body', { sender: acceptorUsername }),
    imageUrl: mascotImageUrl('play'),
    data: {
      type: 'challenge_accepted',
      deepLink: `/join/${roomCode}`,
    },
  }, 'both', acceptorUserId);
}

/**
 * Notify challenger that their challenge was declined (N-4)
 */
export async function notifyChallengeDeclined(
  toUserId: string,
  declinerUsername: string,
  declinerUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'challenge_declined', {
    title: translatePush(locale, 'challengeDeclined.title'),
    body: translatePush(locale, 'challengeDeclined.body', { sender: declinerUsername }),
    imageUrl: mascotImageUrl('crying'),
    data: {
      type: 'challenge_declined',
      deepLink: '/friends',
    },
  }, 'in_app_only', declinerUserId);
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
  const locale = await getUserLocale(toUserId);
  const labelKey = `giftLabel.${giftType}`;
  // Fall through to raw giftType if no label key exists in dict
  const label = translatePush(locale, labelKey);
  const resolvedLabel = label === labelKey ? giftType : label;

  return triggerPush(toUserId, 'gift_received', {
    title: translatePush(locale, 'giftReceived.title'),
    body: translatePush(locale, 'giftReceived.body', { sender: senderUsername, label: resolvedLabel }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'gift_received',
      deepLink: '/friends',
    },
  }, 'both', senderId);
}

/**
 * Remind user to complete today's daily challenge (server-side cron)
 * Only called for users who haven't played today (gate enforced by cron query)
 */
export async function notifyDailyChallengeReminder(
  toUserId: string,
  override?: { title?: string; body?: string; deepLink?: string; variant?: number }
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const title = override?.title ?? translatePush(locale, 'dailyChallenge.title');
  const body = override?.body ?? translatePush(locale, 'dailyChallenge.body');
  const deepLink = override?.deepLink ?? '/daily';
  return triggerPush(toUserId, 'daily_challenge', {
    title,
    body,
    imageUrl: mascotImageUrl('encouraging'),
    data: {
      type: 'daily_challenge',
      deepLink,
      ...(override?.variant !== undefined ? { variant: String(override.variant) } : {}),
    },
  }, 'push_only');
}

/**
 * Notify user of a level up (N-11)
 */
export async function notifyLevelUp(
  toUserId: string,
  newLevel: number
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'level_up', {
    title: translatePush(locale, 'levelUp.title', { level: newLevel }),
    body: translatePush(locale, 'levelUp.body', { level: newLevel }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'level_up',
      deepLink: '/adventure',
    },
  }, 'both');
}
