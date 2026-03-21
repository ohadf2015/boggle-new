/**
 * Types for Admin Gift System
 */

export type GiftTemplateType = 'top_player' | 'feedback_request' | 'thank_you' | 'custom';

export interface GiftTemplate {
  id: GiftTemplateType;
  titleKey: string;
  defaultTitle: string;
  defaultMessage: string;
  icon: string;
  suggestedXp: number;
  suggestedCoins: number;
  headerLine: string;
}

export interface GiftRecipient {
  id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_config?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  total_score?: number;
  total_games?: number;
}

export interface GiftFormData {
  recipientIds: string[];
  title: string;
  message: string;
  templateType: GiftTemplateType;
  xpAmount: number;
  coinAmount: number;
  imageUrl?: string;
  badgeId?: string;
}

export interface BadgeOption {
  id: string;
  name_key: string;
  icon: string;
  image_url: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description_key?: string;
}

export interface GiftMessage {
  id: string;
  recipient_id: string;
  sender_id: string;
  title: string;
  message: string;
  template_type: GiftTemplateType | null;
  image_url: string | null;
  xp_amount: number;
  coin_amount: number;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  recipient?: {
    username: string;
    display_name: string | null;
    avatar_emoji: string | null;
    avatar_color: string | null;
  };
  sender?: {
    username: string;
    display_name: string | null;
  };
}

export const GIFT_TEMPLATES: GiftTemplate[] = [
  {
    id: 'top_player',
    titleKey: 'admin.gifts.template.topPlayer',
    defaultTitle: 'Top Player Recognition',
    defaultMessage: "Congratulations! You've been identified as one of our top players. Your dedication and skill haven't gone unnoticed. Keep up the amazing work!",
    icon: '👑',
    suggestedXp: 500,
    suggestedCoins: 250,
    headerLine: "You're one of our top players!",
  },
  {
    id: 'feedback_request',
    titleKey: 'admin.gifts.template.feedback',
    defaultTitle: 'We Value Your Opinion',
    defaultMessage: "As an active player, we'd love to hear your thoughts on improving LexiClash. Your feedback helps us create a better experience for everyone. Feel free to share any suggestions or ideas!",
    icon: '💭',
    suggestedXp: 200,
    suggestedCoins: 100,
    headerLine: 'Your voice matters to us!',
  },
  {
    id: 'thank_you',
    titleKey: 'admin.gifts.template.thankYou',
    defaultTitle: 'Thank You!',
    defaultMessage: "Thank you for being part of the LexiClash community! Your participation makes our game better for everyone. Here's a small token of our appreciation.",
    icon: '💝',
    suggestedXp: 100,
    suggestedCoins: 50,
    headerLine: 'A special thank you from us!',
  },
  {
    id: 'custom',
    titleKey: 'admin.gifts.template.custom',
    defaultTitle: '',
    defaultMessage: '',
    icon: '✨',
    suggestedXp: 0,
    suggestedCoins: 0,
    headerLine: 'A message just for you!',
  },
];

export const REWARD_PRESETS = [
  { label: 'Small', xp: 100, coins: 50 },
  { label: 'Medium', xp: 500, coins: 250 },
  { label: 'Large', xp: 1000, coins: 500 },
  { label: 'Custom', xp: 0, coins: 0 },
];

export const MAX_XP_AMOUNT = 10000;
export const MAX_COIN_AMOUNT = 10000;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_TITLE_LENGTH = 100;
export const MAX_RECIPIENTS = 50;
