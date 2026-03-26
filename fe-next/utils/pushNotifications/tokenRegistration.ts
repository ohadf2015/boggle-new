/**
 * Push Token Registration
 * Handles FCM token registration for native mobile apps
 */

import { isNative } from '@/utils/platform';

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

// Storage key for device ID (persists across token refreshes)
const DEVICE_ID_KEY = 'lexiclash_push_device_id';

/**
 * Get or create a persistent device ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
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
     
    const cap = (globalThis as any).Capacitor;
    const platform = cap?.getPlatform?.();
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
      console.error('Failed to register push token:', await response.text());
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
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
    console.log('Push registration skipped - not a native platform');
    return false;
  }

  try {
    // Dynamic import for Capacitor plugin
    const { PushNotifications } = { PushNotifications: (globalThis as any).Capacitor?.Plugins?.PushNotifications } as any;

    // Check current permission status
    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'denied') {
      console.log('Push notifications denied by user');
      return false;
    }

    // Request permission if not granted
    if (permStatus.receive !== 'granted') {
      const newStatus = await PushNotifications.requestPermissions();
      if (newStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
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

        console.log('FCM token received:', token.value.substring(0, 20) + '...');
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
    const { PushNotifications } = { PushNotifications: (globalThis as any).Capacitor?.Plugins?.PushNotifications } as any;

    // Handle notification received while app is in foreground
    const receivedListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: { data?: Record<string, string> }) => {
        console.log('Push notification received:', notification);
        if (onNotificationReceived && notification.data) {
          onNotificationReceived(notification.data as Record<string, string>);
        }
      }
    );

    // Handle notification tap (app was in background)
    const actionListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        if (onNotificationTapped && action.notification.data) {
          onNotificationTapped(action.notification.data);
        }
      }
    );

    // Return cleanup function
    return () => {
      receivedListener.remove();
      actionListener.remove();
    };
  } catch (error) {
    console.error('Error setting up push listeners:', error);
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
    const { PushNotifications } = { PushNotifications: (globalThis as any).Capacitor?.Plugins?.PushNotifications } as any;
    const permStatus = await PushNotifications.checkPermissions();
    return permStatus.receive === 'granted';
  } catch {
    return false;
  }
}
