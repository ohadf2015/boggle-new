'use client';

/**
 * NotificationItem Component
 * Displays a single notification in the dropdown list
 */

import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';
import { NOTIFICATION_TYPE_ICONS, NOTIFICATION_TYPE_COLORS, type NotificationItemProps } from './types';

export function NotificationItem({ notification, onClick, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const { t } = useLanguage();

  const icon = NOTIFICATION_TYPE_ICONS[notification.notification_type];
  const colorClass = NOTIFICATION_TYPE_COLORS[notification.notification_type];

  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
    onClick();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        relative flex gap-3 p-3 cursor-pointer transition-all duration-200
        border-b-2 border-black/10 last:border-b-0 w-full text-start
        hover:bg-neo-navy/50
        ${!notification.read ? 'bg-neo-navy/30' : 'bg-transparent'}
      `}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
          border-2 border-black ${colorClass}
          text-lg text-black shadow-hard-sm
        `}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`
            text-sm font-neo-display truncate
            ${!notification.read ? 'text-neo-white font-bold' : 'text-neo-white/80'}
          `}
        >
          {notification.title}
        </h4>
        <p className="text-xs text-neo-white/60 line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <span className="text-xs text-neo-white/40 mt-1 block">
          {timeAgo}
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="
          absolute top-2 end-2
          w-6 h-6 rounded-full
          flex items-center justify-center
          text-neo-white/40 hover:text-neo-white hover:bg-neo-white/10
          transition-all duration-150
        "
        title={t('notifications.dismiss')}
      >
        <X size={14} />
      </button>

      {/* Unread indicator */}
      {!notification.read && (
        <span
          className="
            absolute bottom-3 end-3
            w-2.5 h-2.5 rounded-full bg-neo-cyan
            border border-black
          "
        />
      )}
    </button>
  );
}

export default NotificationItem;
