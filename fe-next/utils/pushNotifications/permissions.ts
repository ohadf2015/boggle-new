/**
 * Push Notification Permissions
 * Uses globalThis.Capacitor.Plugins to avoid @capacitor/* imports that break Turbopack.
 */

 

import { isNative } from '../platform';
import type { PermissionResult, NotificationPermissionStatus } from './types';

function getLocalNotifications(): any | null {
  return (globalThis as any).Capacitor?.Plugins?.LocalNotifications ?? null;
}

function mapPermissionStatus(
  display: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
): NotificationPermissionStatus {
  return display as NotificationPermissionStatus;
}

export async function checkNotificationPermission(): Promise<PermissionResult> {
  if (!isNative()) {
    return { status: 'denied', canSchedule: false };
  }

  try {
    const LN = getLocalNotifications();
    if (!LN) return { status: 'denied', canSchedule: false };

    const result = await LN.checkPermissions();
    const status = mapPermissionStatus(result.display);
    return { status, canSchedule: status === 'granted' };
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return { status: 'denied', canSchedule: false };
  }
}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (!isNative()) {
    return { status: 'denied', canSchedule: false };
  }

  try {
    const LN = getLocalNotifications();
    if (!LN) return { status: 'denied', canSchedule: false };

    const result = await LN.requestPermissions();
    const status = mapPermissionStatus(result.display);
    return { status, canSchedule: status === 'granted' };
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return { status: 'denied', canSchedule: false };
  }
}

export async function canScheduleNotifications(): Promise<boolean> {
  const result = await checkNotificationPermission();
  return result.canSchedule;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const currentStatus = await checkNotificationPermission();
  if (currentStatus.canSchedule) return true;

  if (currentStatus.status === 'prompt' || currentStatus.status === 'prompt-with-rationale') {
    const requestResult = await requestNotificationPermission();
    return requestResult.canSchedule;
  }

  return false;
}
