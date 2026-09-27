/**
 * Supabase Realtime Notifications
 * Subscribes to user_notifications table for real-time in-app notifications
 */

import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Notification type matching database schema
export interface RealtimeNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: 'gift' | 'system' | 'achievement' | 'social' | 'marketing';
  image_url: string | null;
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  read_at: string | null;
  sender_id: string | null;
  created_at: string;
}

// Callback for new notifications
export type NotificationCallback = (notification: RealtimeNotification) => void;

/**
 * Subscribe to real-time notifications for a user
 * @param userId - The user's ID
 * @param onNewNotification - Callback when a new notification is received
 * @param onSubscriptionError - Optional callback when subscription fails (for fallback handling)
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: NotificationCallback,
  onSubscriptionError?: (error: string) => void
): () => void {
  if (!userId) {
    console.warn('Cannot subscribe to notifications: no userId provided');
    return () => {};
  }

  const supabase = createClient();

  // Create a unique channel name for this user
  const channelName = `notifications:${userId}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as RealtimeNotification;
        onNewNotification(notification);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to notifications channel');
      } else if (status === 'CHANNEL_ERROR') {
        // Log the actual error for debugging - Supabase passes error as second param
        const errorMessage = err instanceof Error ? err.message : (err ? String(err) : 'Unknown channel error');

        // Check if this is a configuration mismatch error (Supabase Dashboard issue)
        // This requires enabling Realtime filters in Supabase Dashboard, not a code fix
        // Using console.log instead of console.warn to avoid Sentry noise - graceful fallback works fine
        if (errorMessage.includes('mismatch') || errorMessage.includes('bindings')) {
          console.log(
            '[Notifications] Realtime subscription unavailable (Supabase Dashboard config). ' +
            'Using polling fallback - no action needed.'
          );
        } else {
          // Non-fatal — polling fallback handles it. Use log to avoid Sentry noise.
          console.log('[Notifications] Channel error (using polling fallback):', errorMessage);
        }

        // Notify caller so they can implement fallback (e.g., polling)
        onSubscriptionError?.(errorMessage);
      } else if (status === 'TIMED_OUT') {
        console.log('[Notifications] Channel subscription timed out - will retry');
        onSubscriptionError?.('Subscription timed out');
      }
    });

  // Return cleanup function
  return () => {
    console.log('Unsubscribing from notifications channel');
    supabase.removeChannel(channel);
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/player/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    return response.ok;
  } catch {
    // Network failures (e.g. "Failed to fetch") are transient and non-critical
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  try {
    const response = await fetch('/api/player/notifications/mark-all-read', {
      method: 'POST',
    });

    if (!response.ok) {
      return { success: false, count: 0 };
    }

    const data = await response.json();
    return { success: true, count: data.count || 0 };
  } catch {
    // Network failures are transient and non-critical
    return { success: false, count: 0 };
  }
}

/**
 * Dismiss a single notification (persistent removal from list)
 */
export async function dismissNotificationApi(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/player/notifications/${notificationId}/dismiss`, {
      method: 'POST',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Dismiss all notifications (persistent removal from list)
 */
export async function dismissAllNotificationsApi(): Promise<{ success: boolean; count: number }> {
  try {
    const response = await fetch('/api/player/notifications/dismiss-all', {
      method: 'POST',
    });

    if (!response.ok) {
      return { success: false, count: 0 };
    }

    const data = await response.json();
    return { success: true, count: data.count || 0 };
  } catch {
    return { success: false, count: 0 };
  }
}

/**
 * Fetch notifications from API
 */
export async function fetchNotifications(options: {
  unreadOnly?: boolean;
  dismissedOnly?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  notifications: RealtimeNotification[];
  unreadCount: number;
  total: number;
}> {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set('unreadOnly', 'true');
  if (options.dismissedOnly) params.set('dismissedOnly', 'true');
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const url = `/api/player/notifications${params.toString() ? `?${params}` : ''}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return {
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0,
      total: data.pagination?.total || 0,
    };
  } catch (error) {
    // Serialize error properly for Sentry - Error objects don't stringify well
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching notifications:', errorMessage);
    return { notifications: [], unreadCount: 0, total: 0 };
  }
}
