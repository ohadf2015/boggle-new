'use client';

/**
 * NotificationBell Component
 * Bell icon with unread badge, opens dropdown on click
 */

import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationToast } from './NotificationToast';
import type { NotificationData, NotificationBellProps } from './types';

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    latestNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    clearLatestNotification,
    fetchPreviousNotifications,
    previousNotifications,
    isLoadingPrevious,
  } = useRealtimeNotifications();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle notification click - navigate to action URL (prefixed with locale)
  // Gift notifications open the gift modal directly instead of navigating
  const handleNotificationClick = useCallback(
    (notification: NotificationData) => {
      setIsDropdownOpen(false);
      if (notification.notification_type === 'gift') {
        window.dispatchEvent(new CustomEvent('openGiftModal', {
          detail: { giftId: notification.related_entity_id },
        }));
        if (!notification.read) {
          markAsRead(notification.id);
        }
        return;
      }
      if (notification.action_url) {
        const url = notification.action_url.startsWith('/')
          ? `/${language}${notification.action_url}`
          : notification.action_url;
        router.push(url);
      }
    },
    [router, language, markAsRead]
  );

  // Handle toast action (also needs locale prefix)
  // Gift notifications open the gift modal directly instead of navigating
  const handleToastAction = useCallback(() => {
    if (latestNotification?.notification_type === 'gift') {
      window.dispatchEvent(new CustomEvent('openGiftModal', {
        detail: { giftId: latestNotification.related_entity_id },
      }));
      clearLatestNotification();
      return;
    }
    if (latestNotification?.action_url) {
      const url = latestNotification.action_url.startsWith('/')
        ? `/${language}${latestNotification.action_url}`
        : latestNotification.action_url;
      router.push(url);
    }
    clearLatestNotification();
  }, [latestNotification, router, language, clearLatestNotification]);

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
          relative flex items-center justify-center
          w-10 h-10
          bg-neo-cream dark:bg-neo-navy-elevated text-neo-black dark:text-white
          border-3 border-neo-black dark:border-slate-500
          rounded-neo shadow-hard-sm
          hover:-translate-x-px hover:-translate-y-px hover:shadow-hard hover:bg-neo-lime/30
          active:translate-x-px active:translate-y-px active:shadow-none
          transition-all duration-100
          focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2
          cursor-pointer
        "
        aria-label={unreadCount > 0
          ? t('notifications.bellUnread', 'Notifications', { count: unreadCount })
          : t('notifications.bell', 'Notifications')}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
      >
        <Bell size={18} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-0.5 -inset-e-0.5
              min-w-5 h-5 px-1.5 rounded-full
              bg-neo-lime text-black
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
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
        onFetchPrevious={fetchPreviousNotifications}
        previousNotifications={previousNotifications as NotificationData[]}
        isLoadingPrevious={isLoadingPrevious}
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
