/**
 * Notification Component Types
 */

export type NotificationType = 'gift' | 'system' | 'achievement' | 'social' | 'marketing';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  notification_type: NotificationType;
  image_url: string | null;
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    username: string;
    display_name: string | null;
    avatar_emoji: string | null;
    avatar_color: string | null;
  } | null;
}

export interface NotificationBellProps {
  className?: string;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationData[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationData) => void;
}

export interface NotificationItemProps {
  notification: NotificationData;
  onClick: () => void;
  onMarkAsRead: () => void;
}

export interface NotificationToastProps {
  notification: NotificationData | null;
  onDismiss: () => void;
  onAction: () => void;
}

// Icon mapping for notification types
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  gift: '🎁',
  system: '🔔',
  achievement: '🏆',
  social: '👥',
  marketing: '📢',
};

// Color mapping for notification types
export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  gift: 'bg-neo-yellow',
  system: 'bg-neo-cyan',
  achievement: 'bg-neo-orange',
  social: 'bg-neo-pink',
  marketing: 'bg-neo-lime',
};
