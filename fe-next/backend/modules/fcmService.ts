/**
 * FCM Service
 * Sends push notifications via Firebase Cloud Messaging
 * Fire-and-forget design — never throws, never blocks game flow
 */

import logger from '../utils/logger';
import { getSupabase, isSupabaseConfigured } from './supabase';

export interface FCMPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

// Stale token error codes that indicate the token should be deactivated
const STALE_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
];

/**
 * Get or initialize the Firebase Admin app
 * Lazy initialization — only creates app when first push is sent
 */
function getFirebaseApp() {
  try {
    const admin = require('firebase-admin');

    if (admin.apps.length > 0) {
      return admin.app();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      logger.warn('FCM', 'Firebase credentials not configured — push notifications disabled');
      return null;
    }

    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } catch (error) {
    logger.error('FCM', `Failed to initialize Firebase: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Send push notification to a single user (all their active devices)
 * Never throws — logs errors and returns silently
 */
export async function sendToUser(userId: string, payload: FCMPayload): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('id, token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      logger.error('FCM', `Failed to fetch tokens for ${userId}: ${error.message}`);
      return;
    }

    if (!tokens || tokens.length === 0) return;

    const app = getFirebaseApp();
    if (!app) return;

    const messaging = app.messaging();
    const fcmTokens = tokens.map((t: { token: string }) => t.token);

    const result = await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data,
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      android: {
        priority: 'high' as const,
        notification: { sound: 'default' },
      },
    });

    // Deactivate stale tokens
    if (result.failureCount > 0) {
      const staleTokens: string[] = [];

      result.responses.forEach((resp: { success: boolean; error?: { code: string } }, idx: number) => {
        if (!resp.success && resp.error && STALE_TOKEN_ERRORS.includes(resp.error.code)) {
          staleTokens.push(fcmTokens[idx]);
        }
      });

      if (staleTokens.length > 0) {
        logger.info('FCM', `Deactivating ${staleTokens.length} stale tokens for ${userId}`);
        await supabase
          .from('user_push_tokens')
          .update({ is_active: false })
          .in('token', staleTokens);
      }
    }

    logger.debug('FCM', `Sent to ${userId}: ${result.successCount}/${fcmTokens.length} delivered`);
  } catch (error) {
    logger.error('FCM', `Failed to send to ${userId}: ${(error as Error).message}`);
  }
}

/**
 * Send push notification to multiple users in parallel
 * Never throws — logs errors and returns silently
 */
export async function sendToUsers(userIds: string[], payload: FCMPayload): Promise<void> {
  if (userIds.length === 0) return;

  await Promise.allSettled(userIds.map((userId) => sendToUser(userId, payload)));
}
