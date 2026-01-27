/**
 * Notification Scheduler
 * Handles scheduling and managing daily challenge notifications
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../platform';
import { canScheduleNotifications } from './permissions';
import {
  NOTIFICATION_IDS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  STORAGE_KEYS,
  type ScheduleResult,
  type DailyScheduleOptions,
  type NotificationMessage,
} from './types';

/**
 * Get the next message index in the rotation
 * Cycles through all message templates for variety
 */
export function getNextMessageIndex(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION_INDEX);
    const lastIndex = stored ? parseInt(stored, 10) : -1;
    const nextIndex = (lastIndex + 1) % NOTIFICATION_MESSAGES.length;
    return nextIndex;
  } catch {
    // localStorage not available
    return 0;
  }
}

/**
 * Save the current message index for next time
 */
function saveMessageIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_NOTIFICATION_INDEX, String(index));
  } catch {
    // localStorage not available - ignore
  }
}

/**
 * Get a random letter hint (A-Z)
 * Used to tease the daily challenge
 */
export function getRandomLetterHint(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomIndex = Math.floor(Math.random() * letters.length);
  return letters[randomIndex];
}

/**
 * Build notification content based on message index
 */
export function buildNotificationContent(
  messageIndex: number,
  letterHint?: string
): {
  titleKey: string;
  bodyKey: string;
  letterHint?: string;
} {
  const message = NOTIFICATION_MESSAGES[messageIndex];

  return {
    titleKey: message.titleKey,
    bodyKey: message.bodyKey,
    // Only include letter hint if this message type supports it
    letterHint: message.hasLetterHint ? letterHint : undefined,
  };
}

/**
 * Schedule a daily notification at the specified time
 * @param options - Scheduling options including hour and minute
 * @returns Result indicating success or failure
 */
export async function scheduleDailyNotification(
  options: DailyScheduleOptions
): Promise<ScheduleResult> {
  const { hour, minute, letterHint } = options;

  // Check platform
  if (!isNative()) {
    return {
      success: false,
      error: 'Push notifications are not available on web platform',
    };
  }

  // Check permission
  const hasPermission = await canScheduleNotifications();
  if (!hasPermission) {
    return {
      success: false,
      error: 'Notification permission not granted',
    };
  }

  try {
    // Get next message in rotation
    const messageIndex = getNextMessageIndex();
    const actualLetterHint = letterHint || getRandomLetterHint();
    const content = buildNotificationContent(messageIndex, actualLetterHint);

    // Schedule the notification
    const result = await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.DAILY_CHALLENGE,
          title: content.titleKey, // Will be replaced with actual text by the hook
          body: content.bodyKey, // Will be replaced with actual text by the hook
          schedule: {
            on: {
              hour,
              minute,
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          extra: {
            route: NOTIFICATION_ROUTES.DAILY_CHALLENGE,
            // Always store letterHint for potential use, even if current message doesn't use it
            letterHint: actualLetterHint,
            messageIndex,
          },
        },
      ],
    });

    // Save the message index for next time
    saveMessageIndex(messageIndex);

    return {
      success: true,
      notificationId: result.notifications[0]?.id ?? NOTIFICATION_IDS.DAILY_CHALLENGE,
    };
  } catch (error) {
    console.error('Failed to schedule daily notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error scheduling notification',
    };
  }
}

/**
 * Cancel the daily challenge notification
 */
export async function cancelDailyNotification(): Promise<void> {
  if (!isNative()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIFICATION_IDS.DAILY_CHALLENGE }],
    });
  } catch (error) {
    // Log but don't throw - canceling non-existent notification is fine
    console.error('Failed to cancel daily notification:', error);
  }
}

/**
 * Check if there's a pending daily notification
 */
export async function hasPendingDailyNotification(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.some((n) => n.id === NOTIFICATION_IDS.DAILY_CHALLENGE);
  } catch {
    return false;
  }
}

/**
 * Reschedule notification for tomorrow
 * Used after user completes today's challenge (smart skip)
 */
export async function rescheduleForTomorrow(options: DailyScheduleOptions): Promise<ScheduleResult> {
  // First cancel existing
  await cancelDailyNotification();

  // Then schedule new one - the `on` schedule with repeats will naturally
  // fire at the next occurrence of that time
  return scheduleDailyNotification(options);
}
