/**
 * Notification Scheduler
 * Uses globalThis.Capacitor.Plugins to avoid @capacitor/* imports that break Turbopack.
 */

 

import { isNative } from '../platform';
import { canScheduleNotifications } from './permissions';
import {
  NOTIFICATION_IDS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  STORAGE_KEYS,
  type ScheduleResult,
  type DailyScheduleOptions,
} from './types';

function getLocalNotifications(): any | null {
  return (globalThis as any).Capacitor?.Plugins?.LocalNotifications ?? null;
}

export function getNextMessageIndex(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION_INDEX);
    const lastIndex = stored ? parseInt(stored, 10) : -1;
    const nextIndex = (lastIndex + 1) % NOTIFICATION_MESSAGES.length;
    return nextIndex;
  } catch {
    return 0;
  }
}

function saveMessageIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_NOTIFICATION_INDEX, String(index));
  } catch {
    // localStorage not available
  }
}

export function getRandomLetterHint(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomIndex = Math.floor(Math.random() * letters.length);
  return letters[randomIndex];
}

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
    letterHint: message.hasLetterHint ? letterHint : undefined,
  };
}

export async function scheduleDailyNotification(
  options: DailyScheduleOptions
): Promise<ScheduleResult> {
  const { hour, minute, letterHint } = options;

  if (!isNative()) {
    return { success: false, error: 'Push notifications are not available on web platform' };
  }

  const hasPermission = await canScheduleNotifications();
  if (!hasPermission) {
    return { success: false, error: 'Notification permission not granted' };
  }

  try {
    const LN = getLocalNotifications();
    if (!LN) return { success: false, error: 'LocalNotifications plugin not available' };

    const messageIndex = getNextMessageIndex();
    const actualLetterHint = letterHint || getRandomLetterHint();
    const content = buildNotificationContent(messageIndex, actualLetterHint);

    const result = await LN.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.DAILY_CHALLENGE,
          title: content.titleKey,
          body: content.bodyKey,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          extra: {
            route: NOTIFICATION_ROUTES.DAILY_CHALLENGE,
            letterHint: actualLetterHint,
            messageIndex,
          },
        },
      ],
    });

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

export async function cancelDailyNotification(): Promise<void> {
  if (!isNative()) return;

  try {
    const LN = getLocalNotifications();
    if (LN) await LN.cancel({ notifications: [{ id: NOTIFICATION_IDS.DAILY_CHALLENGE }] });
  } catch (error) {
    console.error('Failed to cancel daily notification:', error);
  }
}

export async function hasPendingDailyNotification(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const LN = getLocalNotifications();
    if (!LN) return false;
    const pending = await LN.getPending();
    return pending.notifications.some((n: any) => n.id === NOTIFICATION_IDS.DAILY_CHALLENGE);
  } catch {
    return false;
  }
}

export async function rescheduleForTomorrow(options: DailyScheduleOptions): Promise<ScheduleResult> {
  await cancelDailyNotification();
  return scheduleDailyNotification(options);
}
