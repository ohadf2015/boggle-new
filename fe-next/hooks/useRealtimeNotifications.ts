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
  dismissNotificationApi,
  dismissAllNotificationsApi,
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
  /** Dismiss a notification (mark read + remove from local list) */
  dismissNotification: (notificationId: string) => Promise<void>;
  /** Clear all notifications (dismiss persistently + remove from list) */
  clearAllNotifications: () => Promise<void>;
  /** Clear the latest notification (after toast is dismissed) */
  clearLatestNotification: () => void;
  /** Refresh notifications from server */
  refresh: () => Promise<void>;
  /** Fetch previously dismissed notifications */
  fetchPreviousNotifications: () => Promise<RealtimeNotification[]>;
  /** Previously dismissed notifications */
  previousNotifications: RealtimeNotification[];
  /** Whether previous notifications are loading */
  isLoadingPrevious: boolean;
}

export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<RealtimeNotification | null>(null);
  const [previousNotifications, setPreviousNotifications] = useState<RealtimeNotification[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

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

      usePollingFallbackRef.current = true;

      // Track all notification ids we've processed so dismissed ones don't reappear.
      // Using a Set (not a single watermark) — once an id is seen, it stays seen even if
      // the user dismisses it and it drops out of subsequent server responses.
      const seenIds = new Set<string>();
      let seeded = false;

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await fetchNotifications({ limit: 5 });
          setUnreadCount(data.unreadCount);

          if (!seeded) {
            // First tick: mark everything as seen without firing handler —
            // initial fetch already populated the list.
            data.notifications.forEach((n) => seenIds.add(n.id));
            seeded = true;
            return;
          }

          // Oldest→newest so newest ends up on top of the list
          for (const n of [...data.notifications].reverse()) {
            if (!seenIds.has(n.id)) {
              seenIds.add(n.id);
              handleNewNotification(n);
            }
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

  // Dismiss a notification — persistently hide from list
  const dismissNotification = useCallback(async (notificationId: string) => {
    const success = await dismissNotificationApi(notificationId);
    if (success) {
      // Read notification state before updating — avoid nested setState in updater
      const removed = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (removed && !removed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
  }, [notifications]);

  // Clear all notifications — persistently dismiss all
  const clearAllNotifications = useCallback(async () => {
    const result = await dismissAllNotificationsApi();
    if (result.success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  // Fetch previously dismissed notifications
  const fetchPreviousNotifications = useCallback(async () => {
    setIsLoadingPrevious(true);
    try {
      const data = await fetchNotifications({ dismissedOnly: true, limit: 50 });
      setPreviousNotifications(data.notifications);
      return data.notifications;
    } finally {
      setIsLoadingPrevious(false);
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
    dismissNotification,
    clearAllNotifications,
    clearLatestNotification,
    refresh,
    fetchPreviousNotifications,
    previousNotifications,
    isLoadingPrevious,
  };
}

export default useRealtimeNotifications;
