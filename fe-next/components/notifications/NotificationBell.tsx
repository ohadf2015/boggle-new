'use client';

/**
 * NotificationBell Component
 * Bell icon with unread badge, opens dropdown on click
 */

import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationToast } from './NotificationToast';
import type { NotificationData, NotificationBellProps } from './types';

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    latestNotification,
    markAsRead,
    markAllAsRead,
    clearLatestNotification,
  } = useRealtimeNotifications();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle notification click - navigate to action URL
  const handleNotificationClick = useCallback(
    (notification: NotificationData) => {
      setIsDropdownOpen(false);
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    },
    [router]
  );

  // Handle toast action
  const handleToastAction = useCallback(() => {
    if (latestNotification?.action_url) {
      router.push(latestNotification.action_url);
    }
    clearLatestNotification();
  }, [latestNotification, router, clearLatestNotification]);

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bell button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="
          relative p-2 rounded-lg
          text-neo-white/70 hover:text-neo-white
          hover:bg-white/10 transition-colors
          focus:outline-none focus:ring-2 focus:ring-neo-yellow/50
        "
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={22} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-0.5 -right-0.5
              min-w-5 h-5 px-1.5 rounded-full
              bg-neo-yellow text-black
              text-xs font-bold flex items-center justify-center
              border-2 border-black
              animate-in zoom-in duration-200
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <NotificationDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        notifications={notifications as NotificationData[]}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* Toast for new notifications */}
      <NotificationToast
        notification={latestNotification as NotificationData | null}
        onDismiss={clearLatestNotification}
        onAction={handleToastAction}
      />
    </div>
  );
}

export default NotificationBell;
