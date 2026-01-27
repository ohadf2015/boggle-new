/**
 * Push Notification Types
 * Types and interfaces for the daily challenge notification system
 */

/**
 * Permission status for notifications
 */
export type NotificationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

/**
 * Result of a permission check or request
 */
export interface PermissionResult {
  status: NotificationPermissionStatus;
  canSchedule: boolean;
}

/**
 * User preferences for push notifications
 */
export interface PushNotificationPreferences {
  /** Whether push notifications are enabled */
  enabled: boolean;
  /** Hour to send notification (0-23), default 9 */
  hour: number;
  /** Minute to send notification (0-59), default 0 */
  minute: number;
}

/**
 * Default preferences
 */
export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  enabled: true,
  hour: 9,
  minute: 0,
};

/**
 * Notification IDs for different notification types
 * Using fixed IDs allows us to update/cancel specific notifications
 */
export const NOTIFICATION_IDS = {
  DAILY_CHALLENGE: 1001,
} as const;

/**
 * Action type IDs for notification interactions
 */
export const ACTION_TYPE_IDS = {
  DAILY_CHALLENGE: 'DAILY_CHALLENGE_ACTION',
} as const;

/**
 * A varied notification message template
 */
export interface NotificationMessage {
  /** Translation key for title */
  titleKey: string;
  /** Translation key for body */
  bodyKey: string;
  /** Whether this message includes a letter hint placeholder */
  hasLetterHint: boolean;
}

/**
 * Varied notification messages to keep users engaged
 * Some include {letter} placeholder for a spoiler hint
 */
export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  // Standard engaging messages
  {
    titleKey: 'pushNotifications.daily.title1',
    bodyKey: 'pushNotifications.daily.body1',
    hasLetterHint: false,
  },
  {
    titleKey: 'pushNotifications.daily.title2',
    bodyKey: 'pushNotifications.daily.body2',
    hasLetterHint: false,
  },
  // Messages with letter spoiler
  {
    titleKey: 'pushNotifications.daily.title3',
    bodyKey: 'pushNotifications.daily.bodyWithHint',
    hasLetterHint: true,
  },
  {
    titleKey: 'pushNotifications.daily.title4',
    bodyKey: 'pushNotifications.daily.body4',
    hasLetterHint: false,
  },
  // More variety
  {
    titleKey: 'pushNotifications.daily.title5',
    bodyKey: 'pushNotifications.daily.bodyWithHint2',
    hasLetterHint: true,
  },
  {
    titleKey: 'pushNotifications.daily.title6',
    bodyKey: 'pushNotifications.daily.body6',
    hasLetterHint: false,
  },
  {
    titleKey: 'pushNotifications.daily.title7',
    bodyKey: 'pushNotifications.daily.body7',
    hasLetterHint: false,
  },
];

/**
 * Deep link routes for notification actions
 */
export const NOTIFICATION_ROUTES = {
  DAILY_CHALLENGE: '/daily',
} as const;

/**
 * Storage keys for notification-related data
 */
export const STORAGE_KEYS = {
  PUSH_PREFERENCES: 'lexiclash_push_preferences',
  LAST_NOTIFICATION_INDEX: 'lexiclash_last_notification_index',
} as const;

/**
 * Result of scheduling a notification
 */
export interface ScheduleResult {
  success: boolean;
  notificationId?: number;
  error?: string;
}

/**
 * Options for scheduling a daily notification
 */
export interface DailyScheduleOptions {
  /** Hour to schedule (0-23) */
  hour: number;
  /** Minute to schedule (0-59) */
  minute: number;
  /** Optional letter hint to include in message */
  letterHint?: string;
}
