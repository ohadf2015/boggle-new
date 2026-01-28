/**
 * useRealtimeNotifications Hook
 * Manages real-time in-app notifications via Supabase Realtime
 *
 * Features:
 * - Real-time subscription to new notifications
 * - Local state management for notification list
 * - Mark as read functionality
 * - Auto-dismissing toast notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToNotifications,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type RealtimeNotification,
} from '@/lib/supabaseRealtimeNotifications';

// Re-export the notification type
export type { RealtimeNotification } from '@/lib/supabaseRealtimeNotifications';

interface UseRealtimeNotificationsReturn {
  /** List of recent notifications */
  notifications: RealtimeNotification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Whether initial fetch is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Most recent notification (for toast display) */
  latestNotification: RealtimeNotification | null;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Clear the latest notification (after toast is dismissed) */
  clearLatestNotification: () => void;
  /** Refresh notifications from server */
  refresh: () => Promise<void>;
}

export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<RealtimeNotification | null>(null);

  // Track if we've done initial fetch
  const hasFetchedRef = useRef(false);

  // Track if realtime subscription failed (to enable polling fallback)
  const usePollingFallbackRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling interval when Realtime subscription fails (30 seconds)
  const POLLING_INTERVAL_MS = 30000;

  // Fetch notifications from API
  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      const data = await fetchNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
    }
  }, [user]);

  // Initial fetch when user is available
  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(false);
      return;
    }

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
  }, [user, authLoading, refresh]);

  // Subscribe to real-time notifications with polling fallback
  useEffect(() => {
    if (!user) return;

    // Handler for new notifications (from Realtime or polling)
    const handleNewNotification = (newNotification: RealtimeNotification) => {
      // Add to the beginning of the list
      setNotifications((prev) => [newNotification, ...prev.slice(0, 19)]);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Set as latest for toast display
      setLatestNotification(newNotification);
    };

    // Start polling fallback when Realtime subscription fails
    const startPollingFallback = () => {
      if (pollingIntervalRef.current) return; // Already polling

      console.log('Starting notification polling fallback');
      usePollingFallbackRef.current = true;

      // Track the last notification we've seen to detect new ones
      let lastSeenId: string | null = null;

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await fetchNotifications({ limit: 5 });
          setUnreadCount(data.unreadCount);

          // Check for new notifications
          if (data.notifications.length > 0) {
            const newest = data.notifications[0];
            if (lastSeenId && newest.id !== lastSeenId) {
              // New notification arrived - find all new ones
              const lastSeenIndex = data.notifications.findIndex(n => n.id === lastSeenId);
              const newNotifications = lastSeenIndex === -1
                ? data.notifications
                : data.notifications.slice(0, lastSeenIndex);

              // Process new notifications (oldest first so newest ends up on top)
              newNotifications.reverse().forEach(handleNewNotification);
            }
            lastSeenId = newest.id;
          }
        } catch {
          // Silently fail - polling is best-effort fallback
        }
      }, POLLING_INTERVAL_MS);
    };

    // Handle Realtime subscription errors
    const handleSubscriptionError = () => {
      startPollingFallback();
    };

    const cleanup = subscribeToNotifications(
      user.id,
      handleNewNotification,
      handleSubscriptionError
    );

    return () => {
      cleanup();
      // Clear polling if active
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user]);

  // Reset state when user changes
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLatestNotification(null);
      hasFetchedRef.current = false;
    }
  }, [user]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await markNotificationRead(notificationId);

    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const result = await markAllNotificationsRead();

    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  }, []);

  // Clear the latest notification (called after toast auto-dismisses)
  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    latestNotification,
    markAsRead,
    markAllAsRead,
    clearLatestNotification,
    refresh,
  };
}

export default useRealtimeNotifications;
