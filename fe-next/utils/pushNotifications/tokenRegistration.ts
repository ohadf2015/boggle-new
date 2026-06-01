/**
 * Push Token Registration
 * Handles FCM token registration for native mobile apps
 */

import { isNative } from '@/utils/platform';
import { trackGrowthEvent } from '@/utils/growthTracking';

// Types for Capacitor Push Notifications (dynamic import)
interface PushNotificationToken {
  value: string;
}

interface PushNotificationRegistrationError {
  error: string;
}

interface ActionPerformed {
  notification: {
    data?: Record<string, string>;
  };
}

interface PushNotificationsPlugin {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: <T = unknown>(event: string, handler: (data: T) => void) => Promise<{ remove: () => void }>;
}

interface LocalNotificationActionPerformed {
  notification: {
    extra?: Record<string, string>;
  };
}

interface LocalNotificationsPlugin {
  schedule: (opts: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      extra?: Record<string, string>;
    }>;
  }) => Promise<void>;
  addListener?: <T = unknown>(event: string, handler: (data: T) => void) => Promise<{ remove: () => void }>;
}

interface CapacitorGlobal {
  Capacitor?: {
    getPlatform?: () => string;
    Plugins?: {
      PushNotifications?: PushNotificationsPlugin;
      LocalNotifications?: LocalNotificationsPlugin;
    };
  };
}

const capGlobal = globalThis as unknown as CapacitorGlobal;

// Storage key for device ID (persists across token refreshes)
const DEVICE_ID_KEY = 'lexiclash_push_device_id';

/**
 * UUID v4 generator with fallback for Chrome WebView < 92 (no crypto.randomUUID).
 * Exported for unit testing only.
 */
export function _generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Math.random-based UUID v4 for old WebViews
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a persistent device ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = _generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the current platform
 */
async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  if (typeof window === 'undefined') return 'web';

  try {
    const platform = capGlobal.Capacitor?.getPlatform?.();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Register push token with the server
 */
async function registerTokenWithServer(
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/player/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, platform, deviceId }),
    });

    if (!response.ok) {
      console.debug('Push token server rejected:', response.status, await response.text());
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    // Transient network failure (offline, WebView lifecycle race) — non-actionable.
    // Downgraded to debug so Sentry stops capturing as error (JAVASCRIPT-NEXTJS-12C).
    console.debug('Push token network error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Request push notification permission and register token
 * Returns true if registration was successful
 */
export async function registerPushToken(): Promise<boolean> {
  // Only works on native platforms
  if (!isNative()) {
    return false;
  }

  try {
    const PushNotifications = capGlobal.Capacitor?.Plugins?.PushNotifications;
    if (!PushNotifications) return false;

    // Check current permission status
    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'denied') {
      return false;
    }

    // Request permission if not granted
    if (permStatus.receive !== 'granted') {
      const newStatus = await PushNotifications.requestPermissions();
      if (newStatus.receive !== 'granted') {
        return false;
      }
    }

    // Get platform and device ID
    const platform = await getPlatform();
    const deviceId = getDeviceId();

    // Set up registration handler
    return new Promise<boolean>((resolve) => {
      let resolved = false;

      // Handle successful registration
      PushNotifications.addListener('registration', async (token: PushNotificationToken) => {
        if (resolved) return;
        resolved = true;

        const success = await registerTokenWithServer(token.value, platform, deviceId);
        resolve(success);
      });

      // Handle registration error
      PushNotifications.addListener('registrationError', (error: PushNotificationRegistrationError) => {
        if (resolved) return;
        resolved = true;

        console.error('Push registration error:', error.error);
        resolve(false);
      });

      // Trigger registration
      PushNotifications.register().catch((err: Error) => {
        if (resolved) return;
        resolved = true;

        console.error('Push registration failed:', err);
        resolve(false);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (resolved) return;
        resolved = true;

        console.error('Push registration timeout');
        resolve(false);
      }, 10000);
    });
  } catch (error) {
    console.error('Error in registerPushToken:', error);
    return false;
  }
}

/**
 * Unregister push token (call on logout)
 */
export async function unregisterPushToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/player/push-token', {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
  }
}

/**
 * Set up push notification listeners for handling received notifications
 * Call this once on app initialization
 */
export async function setupPushListeners(
  onNotificationReceived?: (data: Record<string, string>) => void,
  onNotificationTapped?: (data: Record<string, string>) => void
): Promise<() => void> {
  if (!isNative()) {
    return () => {}; // No-op cleanup for web
  }

  try {
    const PushNotifications = capGlobal.Capacitor?.Plugins?.PushNotifications;

    if (!PushNotifications) {
      return () => {}; // Plugin not available (e.g., Android WebView without Capacitor)
    }

    const LocalNotifications = capGlobal.Capacitor?.Plugins?.LocalNotifications;

    // Handle notification received while app is in foreground.
    // Capacitor's PushNotifications plugin does NOT display a system-tray
    // notification when the app is foregrounded — we must bridge to
    // LocalNotifications ourselves, otherwise users see nothing.
    const receivedListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: { title?: string; body?: string; data?: Record<string, string> }) => {
        try {
          trackGrowthEvent('notification_delivered', {
            type: notification.data?.type ?? 'unknown',
            campaign: notification.data?.campaign,
            actionUrl: notification.data?.actionUrl,
          });
        } catch {
          // analytics never blocks delivery
        }

        if (onNotificationReceived && notification.data) {
          onNotificationReceived(notification.data as Record<string, string>);
        }

        if (LocalNotifications && (notification.title || notification.body)) {
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now() % 2147483647,
                  title: notification.title || '',
                  body: notification.body || '',
                  extra: notification.data || {},
                },
              ],
            });
          } catch (err) {
            console.debug('LocalNotifications.schedule failed:', err);
          }
        }
      }
    );

    // Handle notification tap (app was in background)
    const actionListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        try {
          trackGrowthEvent('notification_clicked', {
            type: action.notification.data?.type ?? 'unknown',
            campaign: action.notification.data?.campaign,
            actionUrl: action.notification.data?.actionUrl,
          });
        } catch {
          // analytics never blocks tap handling
        }

        if (onNotificationTapped && action.notification.data) {
          onNotificationTapped(action.notification.data);
        }
      }
    );

    // Handle taps on the LOCAL notification we scheduled to make a
    // foreground-received push visible. Capacitor routes these through
    // `localNotificationActionPerformed` (with the payload in `extra`), NOT
    // `pushNotificationActionPerformed` — so without this listener a push that
    // arrived while the app was open silently fails to deep-link on tap.
    let localActionListener: { remove: () => void } | null = null;
    if (LocalNotifications?.addListener) {
      localActionListener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action: LocalNotificationActionPerformed) => {
          const data = action.notification?.extra;
          try {
            trackGrowthEvent('notification_clicked', {
              type: data?.type ?? 'unknown',
              campaign: data?.campaign,
              actionUrl: data?.actionUrl,
            });
          } catch {
            // analytics never blocks tap handling
          }

          if (onNotificationTapped && data) {
            onNotificationTapped(data);
          }
        }
      );
    }

    // Return cleanup function
    return () => {
      receivedListener.remove();
      actionListener.remove();
      localActionListener?.remove();
    };
  } catch (error) {
    console.debug('Error setting up push listeners:', error);
    return () => {};
  }
}

/**
 * Check if push notifications are available and enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const PushNotifications = capGlobal.Capacitor?.Plugins?.PushNotifications;
    if (!PushNotifications) return false;
    const permStatus = await PushNotifications.checkPermissions();
    return permStatus.receive === 'granted';
  } catch {
    return false;
  }
}
