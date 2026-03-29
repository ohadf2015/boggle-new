'use client';

/**
 * NotificationItem Component
 * Displays a single notification in the dropdown list
 */

import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { NOTIFICATION_TYPE_ICONS, NOTIFICATION_TYPE_COLORS, type NotificationItemProps } from './types';

export function NotificationItem({ notification, onClick, onMarkAsRead }: NotificationItemProps) {
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

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead();
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

      {/* Unread indicator */}
      {!notification.read && (
        <button
          onClick={handleMarkAsRead}
          className="
            absolute top-3 end-3
            w-3 h-3 rounded-full bg-neo-yellow
            border border-black
            hover:scale-125 transition-transform
          "
          title={t('notifications.markAsRead')}
        />
      )}
    </button>
  );
}

export default NotificationItem;
