'use client';

/**
 * NotificationDropdown Component
 * Dropdown list showing recent notifications
 */

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { NotificationItem } from './NotificationItem';
import type { NotificationDropdownProps } from './types';

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationDropdownProps) {
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        absolute top-full end-0 mt-2
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
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="
              text-xs text-neo-cyan hover:text-neo-yellow
              transition-colors font-medium
            "
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto max-h-72">
        {notifications.length === 0 ? (
          <div className="py-8 px-4 text-center text-neo-white/50">
            <span className="text-3xl block mb-2">🔔</span>
            <p className="text-sm">
              {t('notifications.empty')}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification)}
              onMarkAsRead={() => onMarkAsRead(notification.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t-2 border-black/20 bg-neo-navy/50">
          <button
            onClick={onClose}
            className="
              w-full text-center text-xs text-neo-white/60
              hover:text-neo-cyan transition-colors
            "
          >
            {t('notifications.viewAll')}
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
