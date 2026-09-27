/**
 * Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging (FCM) HTTP v1 API
 * and creating notification records in Supabase
 */

import logger from '../utils/logger';

import { getSupabase, isSupabaseConfigured } from '../modules/supabaseServer';
import { translatePush, isPushLocale, type PushLocale } from '../utils/pushTranslations';

// ==================== Mascot Imagery ====================

/**
 * Maps a semantic mood to a public mascot asset URL served from /public/mascot/.
 * FCM `notification.image` pulls this over HTTPS, so we need a fully-qualified URL.
 * Android shows it as a big picture; iOS as an attachment (mutable-content=1 required).
 */
export type MascotMood =
  | 'celebration'   // gift, reward, level up
  | 'waving'        // friend request / accepted
  | 'onfire'        // streak, combos
  | 'trophy'        // game win, leaderboard
  | 'crying'        // loss, streak broken
  | 'play'          // challenge invite
  | 'encouraging'   // nudge / daily reminder
  | 'mindblown'     // achievement unlock
  | 'spectating';   // friend message

function publicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
}

export function mascotImageUrl(mood: MascotMood): string {
  return `${publicBaseUrl()}/mascot/${mood}.gif`;
}

// ==================== Types ====================

export interface NotificationPayload {
  /** Raw title used when no titleKey is provided (legacy callers). */
  title: string;
  /** Raw body used when no bodyKey is provided (legacy callers). */
  body: string;
  /** Optional translation key. If set, overrides `title` per-recipient via translatePush. */
  titleKey?: string;
  /** Optional translation key. If set, overrides `body` per-recipient via translatePush. */
  bodyKey?: string;
  /** Params for {var} interpolation in titleKey/bodyKey templates. */
  params?: Record<string, string | number>;
  notificationType: 'gift' | 'system' | 'achievement' | 'social' | 'marketing';
  imageUrl?: string;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  senderId?: string;
}

/**
 * Render a payload's title/body for a single recipient's locale.
 * - If titleKey/bodyKey present → translate via translatePush (with params).
 * - Else → return raw title/body.
 * Exported for testing and for callers that need per-user strings.
 */
export function renderNotification(
  payload: NotificationPayload,
  locale: PushLocale | string | null | undefined
): { title: string; body: string } {
  const loc: PushLocale = isPushLocale(locale) ? locale : 'en';
  const title = payload.titleKey
    ? translatePush(loc, payload.titleKey, payload.params)
    : payload.title;
  const body = payload.bodyKey
    ? translatePush(loc, payload.bodyKey, payload.params)
    : payload.body;
  return { title, body };
}

export interface GiftNotificationData {
  recipientId: string;
  giftId: string;
  senderName: string;
  title: string;
  xpAmount: number;
  coinAmount: number;
  badgeId?: string;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'high' | 'normal';
      notification?: {
        icon?: string;
        color?: string;
        click_action?: string;
      };
    };
    apns?: {
      payload: {
        aps: {
          sound?: string;
          badge?: number;
          'mutable-content'?: number;
        };
      };
    };
  };
}

interface DeliveryResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ token: string; error: string }>;
}

interface TokenRecord {
  id: string;
  user_id: string;
  token: string;
  platform: string;
}

// ==================== FCM Authentication ====================

let cachedAccessToken: string | null = null;
let cachedProjectId: string | null = null;
let tokenExpiresAt: number = 0;

interface FCMAuth {
  accessToken: string;
  projectId: string;
}

/**
 * Get FCM access token + projectId using service account credentials.
 * Returns both so send URL and auth share one resolution path.
 */
async function getFCMAccessToken(): Promise<FCMAuth | null> {
  if (cachedAccessToken && cachedProjectId && Date.now() < tokenExpiresAt - 300000) {
    return { accessToken: cachedAccessToken, projectId: cachedProjectId };
  }

  let projectId = process.env.FCM_PROJECT_ID;
  let privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
  let clientEmail = process.env.FCM_CLIENT_EMAIL;

  // Fallback to shared GOOGLE_CREDENTIALS_JSON (same var fcmService.ts uses).
  // Lets one service-account JSON drive both the firebase-admin path and this HTTP v1 path.
  if (!projectId || !privateKey || !clientEmail) {
    const sharedJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (sharedJson) {
      try {
        const creds = JSON.parse(sharedJson);
        projectId = projectId || creds.project_id;
        privateKey = privateKey || creds.private_key;
        clientEmail = clientEmail || creds.client_email;
      } catch (err) {
        logger.warn('PUSH_SERVICE', 'Failed to parse GOOGLE_CREDENTIALS_JSON', { error: (err as Error).message });
      }
    }
  }

  if (!projectId || !privateKey || !clientEmail) {
    logger.warn('PUSH_SERVICE', 'FCM credentials not configured (set GOOGLE_CREDENTIALS_JSON or FCM_PROJECT_ID/FCM_PRIVATE_KEY/FCM_CLIENT_EMAIL) - push notifications disabled');
    return null;
  }

  try {
    // Create JWT for Google OAuth2
    const header = Buffer.from(JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
    })).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // 1 hour
    })).toString('base64url');

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PUSH_SERVICE', `FCM auth failed: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    cachedAccessToken = data.access_token;
    cachedProjectId = projectId;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    logger.debug('PUSH_SERVICE', 'FCM access token obtained');
    return { accessToken: cachedAccessToken, projectId };
  } catch (error) {
    const err = error as Error;
    logger.error('PUSH_SERVICE', `FCM auth error: ${err.message}`);
    return null;
  }
}

// ==================== FCM Sending ====================

/**
 * Send push notification to a single FCM token
 */
async function sendToToken(
  token: string,
  notification: NotificationPayload,
  auth: FCMAuth
): Promise<{ success: boolean; error?: string }> {
  const { accessToken, projectId } = auth;

  const message: FCMMessage = {
    message: {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { image: notification.imageUrl }),
      },
      data: {
        type: notification.notificationType,
        ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
        ...(notification.relatedEntityType && { relatedEntityType: notification.relatedEntityType }),
        ...(notification.relatedEntityId && { relatedEntityId: notification.relatedEntityId }),
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_stat_icon_config_sample',
          color: '#FFE135', // neo-yellow
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            'mutable-content': 1,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string; status?: string } };
      const errorMessage = errorData.error?.message || response.statusText;

      // Check for invalid token errors
      if (
        errorData.error?.status === 'NOT_FOUND' ||
        errorData.error?.status === 'UNREGISTERED' ||
        errorMessage.includes('not a valid FCM registration token')
      ) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

// ==================== Main Service Functions ====================

/**
 * Send notification to specific users
 * Creates notification records and sends push notifications
 */
export async function sendToUsers(
  userIds: string[],
  notification: NotificationPayload
): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) {
    logger.error('PUSH_SERVICE', 'Supabase not configured');
    return { ...result, success: false };
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.error('PUSH_SERVICE', 'Supabase client unavailable');
    return { ...result, success: false };
  }

  // Fetch each recipient's preferred language so the persisted row matches
  // what we'll send via FCM. Missing/unknown locales fall back to 'en' inside renderNotification.
  const userLocales = new Map<string, PushLocale>();
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, language')
    .in('id', userIds);

  if (profileError) {
    logger.warn('PUSH_SERVICE', `Failed to fetch profile languages (falling back to en): ${profileError.message}`);
  } else if (profileRows) {
    for (const row of profileRows as Array<{ id: string; language: string | null }>) {
      userLocales.set(row.id, isPushLocale(row.language) ? row.language : 'en');
    }
  }

  // Create notification records for all users, each rendered in their own language
  const notificationRecords = userIds.map(userId => {
    const { title, body } = renderNotification(notification, userLocales.get(userId) ?? 'en');
    return {
      user_id: userId,
      title,
      body,
      notification_type: notification.notificationType,
      image_url: notification.imageUrl || null,
      action_url: notification.actionUrl || null,
      related_entity_type: notification.relatedEntityType || null,
      related_entity_id: notification.relatedEntityId || null,
      sender_id: notification.senderId || null,
    };
  });

  const { data: insertedNotifications, error: insertError } = await supabase
    .from('user_notifications')
    .insert(notificationRecords)
    .select('id, user_id');

  if (insertError) {
    logger.error('PUSH_SERVICE', `Failed to insert notifications: ${insertError.message}`);
    return { ...result, success: false };
  }

  logger.info('PUSH_SERVICE', `Created ${insertedNotifications.length} notification records`);

  // Get FCM access token + projectId
  const auth = await getFCMAccessToken();
  if (!auth) {
    logger.warn('PUSH_SERVICE', 'FCM not available - notifications saved but push not sent');
    return result;
  }

  // Get active push tokens for all users
  const { data: tokens, error: tokenError } = await supabase
    .from('user_push_tokens')
    .select('id, user_id, token, platform')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (tokenError) {
    logger.error('PUSH_SERVICE', `Failed to fetch tokens: ${tokenError.message}`);
    return result;
  }

  if (!tokens || tokens.length === 0) {
    logger.info('PUSH_SERVICE', 'No active push tokens found for users');
    return result;
  }

  logger.info('PUSH_SERVICE', `Sending push to ${tokens.length} tokens`);

  // Send to each token
  const invalidTokenIds: string[] = [];

  for (const tokenRecord of tokens as TokenRecord[]) {
    const locale = userLocales.get(tokenRecord.user_id) ?? 'en';
    const { title, body } = renderNotification(notification, locale);
    const localizedPayload: NotificationPayload = { ...notification, title, body };
    const sendResult = await sendToToken(tokenRecord.token, localizedPayload, auth);

    if (sendResult.success) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push({ token: tokenRecord.token.substring(0, 20) + '...', error: sendResult.error || 'Unknown' });

      // Mark invalid tokens for cleanup
      if (sendResult.error === 'INVALID_TOKEN') {
        invalidTokenIds.push(tokenRecord.id);
      }
    }
  }

  // Deactivate invalid tokens
  if (invalidTokenIds.length > 0) {
    await supabase
      .from('user_push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', invalidTokenIds);

    logger.info('PUSH_SERVICE', `Deactivated ${invalidTokenIds.length} invalid tokens`);
  }

  // Update notification records with push status
  const notificationIds = insertedNotifications.map((n: { id: string }) => n.id);
  await supabase
    .from('user_notifications')
    .update({
      push_sent: result.sent > 0,
      push_sent_at: new Date().toISOString(),
      push_error: result.failed > 0
        ? result.errors.map(e => e.error).join('; ').slice(0, 500)
        : null,
    })
    .in('id', notificationIds);

  logger.info('PUSH_SERVICE', `Push delivery: ${result.sent} sent, ${result.failed} failed`);

  return result;
}

/**
 * Send gift notifications to recipients
 */
export async function sendGiftNotifications(
  gifts: GiftNotificationData[]
): Promise<DeliveryResult> {
  // Group gifts by recipient to avoid sending multiple notifications
  const byRecipient = new Map<string, GiftNotificationData>();
  for (const gift of gifts) {
    // Keep only the first gift per recipient (they'll see all in the app)
    if (!byRecipient.has(gift.recipientId)) {
      byRecipient.set(gift.recipientId, gift);
    }
  }

  const result: DeliveryResult = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Send notification to each recipient
  for (const [recipientId, gift] of byRecipient) {
    // Pick body translation key by gift shape. Literal string form matters for regression
    // regex in tests — keep the `bodyKey: 'gift.bodyXp...'` shape inline.
    const bodyKey =
      gift.xpAmount > 0 && gift.coinAmount > 0 ? 'gift.bodyXpAndCoins'
      : gift.xpAmount > 0 ? 'gift.bodyXpOnly'
      : gift.coinAmount > 0 ? 'gift.bodyCoinsOnly'
      : gift.badgeId ? 'gift.bodyBadge'
      : 'gift.bodyGeneric';

    // title/body are unused when titleKey/bodyKey are set — left blank since translatePush
    // always resolves (falls back to 'en' internally).
    const notification: NotificationPayload = {
      title: '',
      body: '',
      titleKey: 'gift.title',
      bodyKey,
      params: {
        sender: gift.senderName,
        xp: gift.xpAmount,
        coins: gift.coinAmount,
      },
      notificationType: 'gift',
      imageUrl: mascotImageUrl('celebration'),
      actionUrl: '/',  // Navigate to home - gift modal auto-shows in Header
      relatedEntityType: 'gift',
      relatedEntityId: gift.giftId,
    };

    const singleResult = await sendToUsers([recipientId], notification);
    result.sent += singleResult.sent;
    result.failed += singleResult.failed;
    result.errors.push(...singleResult.errors);
  }

  return result;
}

/**
 * Send notification to a single user (convenience function)
 */
export async function sendToUser(
  userId: string,
  notification: NotificationPayload
): Promise<DeliveryResult> {
  return sendToUsers([userId], notification);
}

// Export service object for cleaner imports
export const pushNotificationService = {
  sendToUsers,
  sendToUser,
  sendGiftNotifications,
};

export default pushNotificationService;
