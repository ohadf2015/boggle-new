/**
 * usePushTokenRegistration Hook
 * Manages FCM token registration lifecycle for native mobile apps
 *
 * Features:
 * - Auto-registers on mount when user is logged in
 * - Handles token refresh
 * - Cleans up on logout
 * - Handles deep links from push notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isNative } from '@/utils/platform';
import {
  registerPushToken,
  unregisterPushToken,
  setupPushListeners,
  isPushEnabled,
} from '@/utils/pushNotifications/tokenRegistration';

interface UsePushTokenRegistrationReturn {
  /** Whether push notifications are available on this platform */
  isAvailable: boolean;
  /** Whether the user has granted push permission */
  isEnabled: boolean;
  /** Whether registration is in progress */
  isRegistering: boolean;
  /** Whether token is registered with server */
  isRegistered: boolean;
  /** Any error that occurred during registration */
  error: string | null;
  /** Manually trigger token registration */
  register: () => Promise<boolean>;
  /** Unregister token (call on logout) */
  unregister: () => Promise<boolean>;
}

export function usePushTokenRegistration(): UsePushTokenRegistrationReturn {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [isAvailable] = useState(() => isNative());
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already registered for this session
  const hasRegisteredRef = useRef(false);
  // Track cleanup function for listeners
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  // Check if push is enabled on mount
  useEffect(() => {
    if (!isAvailable) return;

    isPushEnabled().then(setIsEnabled).catch(() => setIsEnabled(false));
  }, [isAvailable]);

  // Handle deep link navigation from push notifications
  const handleNotificationTap = useCallback(
    (data: Record<string, string>) => {
      const actionUrl = data.actionUrl || data.route;
      if (actionUrl) {
        // Prepend locale for relative paths — Next.js requires /{locale}/ prefix
        const localizedUrl =
          actionUrl.startsWith('/') && !actionUrl.startsWith(`/${language}`)
            ? `/${language}${actionUrl}`
            : actionUrl;
        router.push(localizedUrl);
      }
    },
    [router, language]
  );

  // Register token when user logs in
  const register = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('Push notifications not available on this platform');
      return false;
    }

    if (!user) {
      setError('User must be logged in to register push token');
      return false;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const success = await registerPushToken();

      if (success) {
        setIsRegistered(true);
        setIsEnabled(true);
        hasRegisteredRef.current = true;
      } else {
        setError('Failed to register push token');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [isAvailable, user]);

  // Unregister token (on logout)
  const unregister = useCallback(async (): Promise<boolean> => {
    try {
      const success = await unregisterPushToken();
      if (success) {
        setIsRegistered(false);
        hasRegisteredRef.current = false;
      }
      return success;
    } catch (err) {
      console.error('Error unregistering push token:', err);
      return false;
    }
  }, []);

  // Auto-register when user logs in
  useEffect(() => {
    if (!isAvailable || authLoading) return;

    // User logged in and we haven't registered yet
    if (user && !hasRegisteredRef.current) {
      register();
    }

    // User logged out - unregister
    if (!user && hasRegisteredRef.current) {
      unregister();
    }
  }, [isAvailable, user, authLoading, register, unregister]);

  // Set up notification listeners
  useEffect(() => {
    if (!isAvailable || !user) return;

    setupPushListeners(
      // On notification received (foreground)
      (data) => {
        console.log('Push notification received in foreground:', data);
        // Could show an in-app toast here
      },
      // On notification tapped
      handleNotificationTap
    ).then((cleanup) => {
      cleanupListenersRef.current = cleanup;
    });

    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
    };
  }, [isAvailable, user, handleNotificationTap]);

  return {
    isAvailable,
    isEnabled,
    isRegistering,
    isRegistered,
    error,
    register,
    unregister,
  };
}

export default usePushTokenRegistration;
