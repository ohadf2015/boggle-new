/**
 * Admin Notification Types
 */

export type NotificationType = 'gift' | 'system' | 'achievement' | 'social' | 'marketing';

export interface NotificationRecipient {
  id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
}

export interface NotificationFormData {
  recipientIds: string[];
  title: string;
  body: string;
  notificationType: NotificationType;
  imageUrl?: string;
  actionUrl?: string;
}

export type NotificationStep = 'players' | 'type' | 'message' | 'preview';

// Notification type templates
export const NOTIFICATION_TEMPLATES: Record<NotificationType, {
  label: string;
  icon: string;
  description: string;
  defaultTitle: string;
  defaultBody: string;
}> = {
  gift: {
    label: 'Gift',
    icon: '🎁',
    description: 'Special reward or gift announcement',
    defaultTitle: "You've received a special gift!",
    defaultBody: 'Check your inbox for a surprise!',
  },
  system: {
    label: 'System',
    icon: '🔔',
    description: 'Important system notification',
    defaultTitle: 'Important Update',
    defaultBody: 'We have an important message for you.',
  },
  achievement: {
    label: 'Achievement',
    icon: '🏆',
    description: 'Achievement or milestone announcement',
    defaultTitle: 'Congratulations!',
    defaultBody: "You've reached a new milestone!",
  },
  social: {
    label: 'Social',
    icon: '👥',
    description: 'Social or community notification',
    defaultTitle: 'New Activity',
    defaultBody: 'Something new is happening in the community!',
  },
  marketing: {
    label: 'News',
    icon: '📢',
    description: 'News, updates, or promotional content',
    defaultTitle: 'Check This Out!',
    defaultBody: "We have exciting news to share with you!",
  },
};
