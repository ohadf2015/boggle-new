/**
 * Push Notification Permissions
 * Handles checking and requesting notification permissions on native platforms
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../platform';
import type { PermissionResult, NotificationPermissionStatus } from './types';

/**
 * Map Capacitor permission status to our internal status type
 */
function mapPermissionStatus(
  display: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
): NotificationPermissionStatus {
  return display as NotificationPermissionStatus;
}

/**
 * Check current notification permission status
 * @returns Permission result with status and whether scheduling is possible
 */
export async function checkNotificationPermission(): Promise<PermissionResult> {
  // On web, notifications are not available via this API
  if (!isNative()) {
    return {
      status: 'denied',
      canSchedule: false,
    };
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    const status = mapPermissionStatus(result.display);

    return {
      status,
      canSchedule: status === 'granted',
    };
  } catch (error) {
    // Log but don't crash - return safe default
    console.error('Failed to check notification permissions:', error);
    return {
      status: 'denied',
      canSchedule: false,
    };
  }
}

/**
 * Request notification permission from user
 * @returns Permission result after user responds to prompt
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  // On web, notifications are not available via this API
  if (!isNative()) {
    return {
      status: 'denied',
      canSchedule: false,
    };
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    const status = mapPermissionStatus(result.display);

    return {
      status,
      canSchedule: status === 'granted',
    };
  } catch (error) {
    // User may have cancelled or plugin error
    console.error('Failed to request notification permissions:', error);
    return {
      status: 'denied',
      canSchedule: false,
    };
  }
}

/**
 * Check if notifications can be scheduled
 * Convenience method that returns just the boolean
 * @returns true if notifications can be scheduled
 */
export async function canScheduleNotifications(): Promise<boolean> {
  const result = await checkNotificationPermission();
  return result.canSchedule;
}

/**
 * Ensure permissions are granted, requesting if needed
 * Use this before scheduling notifications
 * @returns true if permission is granted (either already or after request)
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  // First check current status
  const currentStatus = await checkNotificationPermission();

  if (currentStatus.canSchedule) {
    return true;
  }

  // If prompt is available, request permission
  if (currentStatus.status === 'prompt' || currentStatus.status === 'prompt-with-rationale') {
    const requestResult = await requestNotificationPermission();
    return requestResult.canSchedule;
  }

  // Permission was denied - user needs to enable in settings
  return false;
}
