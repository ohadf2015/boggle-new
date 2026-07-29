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
    avatar_config: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
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
  onDismiss: (id: string) => void;
  onClearAll: () => Promise<void>;
  onFetchPrevious: () => Promise<unknown>;
  previousNotifications: NotificationData[];
  isLoadingPrevious: boolean;
}

export interface NotificationItemProps {
  notification: NotificationData;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDismiss: () => void;
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
  gift: 'bg-neo-lime',
  system: 'bg-neo-cyan',
  achievement: 'bg-neo-purple',
  social: 'bg-neo-pink',
  marketing: 'bg-neo-lime',
};
