/**
 * usePushNotifications Hook
 * Manages push notification preferences and scheduling for daily challenge reminders
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isNative } from '@/utils/platform';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleDailyNotification,
  cancelDailyNotification,
  hasPendingDailyNotification,
  DEFAULT_PUSH_PREFERENCES,
  type PushNotificationPreferences,
  type NotificationPermissionStatus,
} from '@/utils/pushNotifications';

const PREFERENCES_STORAGE_KEY = 'lexiclash_push_notification_preferences';

interface UsePushNotificationsReturn {
  /** Whether push notifications are available (native platform) */
  isAvailable: boolean;
  /** Current permission status */
  permissionStatus: NotificationPermissionStatus;
  /** Whether the hook is still loading initial state */
  isLoading: boolean;
  /** Current preferences */
  preferences: PushNotificationPreferences;
  /** Request notification permission from user */
  requestPermission: () => Promise<boolean>;
  /** Enable or disable notifications */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Set the notification time */
  setTime: (hour: number, minute: number) => Promise<void>;
  /** Mark that user completed today's challenge (smart skip) */
  markChallengeCompleted: () => Promise<void>;
  /** Check if there's a pending notification */
  hasPendingNotification: () => Promise<boolean>;
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(): PushNotificationPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PUSH_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: parsed.enabled ?? DEFAULT_PUSH_PREFERENCES.enabled,
        hour: parsed.hour ?? DEFAULT_PUSH_PREFERENCES.hour,
        minute: parsed.minute ?? DEFAULT_PUSH_PREFERENCES.minute,
      };
    }
  } catch {
    // Invalid JSON - use defaults
  }

  return DEFAULT_PUSH_PREFERENCES;
}

/**
 * Save preferences to localStorage
 */
function savePreferences(preferences: PushNotificationPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage not available
  }
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('denied');
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<PushNotificationPreferences>(DEFAULT_PUSH_PREFERENCES);

  // Use ref to track if we've initialized
  const initializedRef = useRef(false);

  // Check if native platform
  const isAvailable = isNative();

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initialize() {
      // Load saved preferences
      const savedPrefs = loadPreferences();
      setPreferences(savedPrefs);

      // Check current permission status
      if (isAvailable) {
        const result = await checkNotificationPermission();
        setPermissionStatus(result.status);

        // If enabled and has permission, ensure notification is scheduled
        if (savedPrefs.enabled && result.canSchedule) {
          const hasPending = await hasPendingDailyNotification();
          if (!hasPending) {
            await scheduleDailyNotification({
              hour: savedPrefs.hour,
              minute: savedPrefs.minute,
            });
          }
        }
      }

      setIsLoading(false);
    }

    initialize();
  }, [isAvailable]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    const result = await requestNotificationPermission();
    setPermissionStatus(result.status);
    return result.canSchedule;
  }, [isAvailable]);

  // Enable or disable notifications
  const setEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      const newPrefs = { ...preferences, enabled };
      setPreferences(newPrefs);
      savePreferences(newPrefs);

      if (!isAvailable) {
        return;
      }

      if (enabled) {
        // Check permission first
        const permResult = await checkNotificationPermission();
        if (!permResult.canSchedule) {
          // Need to request permission
          const requestResult = await requestNotificationPermission();
          setPermissionStatus(requestResult.status);
          if (!requestResult.canSchedule) {
            // Permission denied - disable in preferences
            const disabledPrefs = { ...newPrefs, enabled: false };
            setPreferences(disabledPrefs);
            savePreferences(disabledPrefs);
            return;
          }
        }

        // Schedule the notification
        await scheduleDailyNotification({
          hour: newPrefs.hour,
          minute: newPrefs.minute,
        });
      } else {
        // Cancel existing notification
        await cancelDailyNotification();
      }
    },
    [isAvailable, preferences]
  );

  // Set notification time
  const setTime = useCallback(
    async (hour: number, minute: number): Promise<void> => {
      const newPrefs = { ...preferences, hour, minute };
      setPreferences(newPrefs);
      savePreferences(newPrefs);

      // Only reschedule if enabled and available
      if (!isAvailable || !newPrefs.enabled) {
        return;
      }

      // Check permission
      const permResult = await checkNotificationPermission();
      if (!permResult.canSchedule) {
        return;
      }

      // Cancel old and schedule new
      await cancelDailyNotification();
      await scheduleDailyNotification({
        hour: newPrefs.hour,
        minute: newPrefs.minute,
      });
    },
    [isAvailable, preferences]
  );

  // Mark challenge completed (smart skip)
  const markChallengeCompleted = useCallback(async (): Promise<void> => {
    if (!isAvailable || !preferences.enabled) {
      return;
    }

    // For now, we just let the notification fire tomorrow naturally
    // The `on` schedule with repeats handles this automatically
    // In the future, we could cancel today's notification if it hasn't fired yet
  }, [isAvailable, preferences.enabled]);

  // Check for pending notification
  const hasPending = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }
    return hasPendingDailyNotification();
  }, [isAvailable]);

  return {
    isAvailable,
    permissionStatus,
    isLoading,
    preferences,
    requestPermission,
    setEnabled,
    setTime,
    markChallengeCompleted,
    hasPendingNotification: hasPending,
  };
}
