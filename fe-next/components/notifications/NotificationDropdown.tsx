'use client';

/**
 * NotificationDropdown Component
 * Dropdown list showing recent notifications
 */

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { History } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import type { NotificationDropdownProps } from './types';

const MAX_VISIBLE = 3;

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onDismiss,
  onClearAll,
  onFetchPrevious,
  previousNotifications,
  isLoadingPrevious,
}: NotificationDropdownProps) {
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  // Reset expanded state when dropdown closes — derived from prop change
  const prevIsOpen = useRef(isOpen);
  if (prevIsOpen.current && !isOpen) {
    setShowAll(false);
    setShowPrevious(false);
  }
  prevIsOpen.current = isOpen;

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications;
  const visibleNotifications = showAll ? filteredNotifications : filteredNotifications.slice(0, MAX_VISIBLE);
  const hasMore = filteredNotifications.length > MAX_VISIBLE;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="
        absolute top-full inset-e-0 mt-2
        w-80 max-w-[calc(100vw-1rem)] max-h-96
        bg-neo-navy border-3 border-black rounded-lg
        shadow-hard-lg overflow-hidden
        z-50
        animate-in fade-in slide-in-from-top-2 duration-200
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-3 border-black bg-neo-navy">
        <h3 className="font-neo-display text-neo-white text-lg">
          {t('notifications.title')}
        </h3>
        <div className="flex items-center gap-2">
          {notifications.length > unreadCount && (
            <button
              type="button"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`
                text-xs transition-colors font-medium
                ${showUnreadOnly ? 'text-neo-lime' : 'text-neo-white hover:text-neo-cyan'}
              `}
            >
              {showUnreadOnly ? t('notifications.showAll', 'All') : t('notifications.unreadOnly', 'Unread')}
            </button>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="
                text-xs text-neo-cyan hover:text-neo-lime
                transition-colors font-medium
              "
            >
              {t('notifications.markAllRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="
                text-xs text-neo-white hover:text-neo-red
                transition-colors font-medium
              "
            >
              {t('notifications.clearAll', 'Clear')}
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto max-h-72">
        {notifications.length === 0 ? (
          <div className="py-8 px-4 text-center text-neo-white">
            <span className="text-3xl block mb-2">🔔</span>
            <p className="text-sm">
              {t('notifications.empty')}
            </p>
          </div>
        ) : (
          visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification)}
              onMarkAsRead={() => onMarkAsRead(notification.id)}
              onDismiss={() => onDismiss(notification.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t-2 border-black/20 bg-neo-navy/50 flex flex-col gap-1">
        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="
              w-full text-center text-xs text-neo-cyan
              hover:text-neo-lime transition-colors font-medium
            "
          >
            {t('notifications.viewAll')} ({filteredNotifications.length - MAX_VISIBLE} {t('notifications.more', 'more')})
          </button>
        )}

        {/* Previous notifications toggle */}
        <button
          type="button"
          onClick={() => {
            if (!showPrevious) {
              onFetchPrevious();
            }
            setShowPrevious(!showPrevious);
          }}
          className="
            w-full flex items-center justify-center gap-1.5
            text-xs text-neo-white hover:text-neo-cyan
            transition-colors font-medium py-1
          "
        >
          <History size={12} />
          {showPrevious
            ? t('notifications.hidePrevious', 'Hide previous')
            : t('notifications.showPrevious', 'Previous notifications')}
        </button>
      </div>

      {/* Previous notifications list */}
      {showPrevious && (
        <div className="border-t-2 border-black/20">
          <div className="px-4 py-2 bg-neo-navy/80">
            <span className="text-xs text-neo-white font-medium">
              {t('notifications.previousTitle', 'Previously cleared')}
            </span>
          </div>
          <div className="overflow-y-auto overscroll-contain max-h-64 bg-neo-white/5">
            {isLoadingPrevious ? (
              <div className="py-4 text-center text-neo-white text-xs">
                {t('common.loading', 'Loading...')}
              </div>
            ) : previousNotifications.length === 0 ? (
              <div className="py-4 text-center text-neo-white text-xs">
                {t('notifications.noPrevious', 'No previous notifications')}
              </div>
            ) : (
              previousNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => onNotificationClick(notification)}
                  onMarkAsRead={() => {}}
                  onDismiss={() => {}}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
