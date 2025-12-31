/**
 * Auth type definitions
 * Shared interfaces for authentication context
 */

import type { User } from '@supabase/supabase-js';

export interface ProfileData {
  id: string;
  username: string;
  display_name?: string;
  avatar_image?: string; // New: Avatar image ID
  avatar_emoji?: string;
  avatar_color?: string;
  profile_picture_url?: string | null;
  profile_picture_provider?: string | null;
  total_games?: number;
  total_score?: number;
  total_words?: number;
  total_xp?: number;
  total_time_played?: number;
  longest_word?: string | null;
  longest_word_length?: number;
  achievement_counts?: Record<string, number>;
  current_level?: number;
  ranked_wins?: number;
  casual_wins?: number;
  ranked_games?: number;
  ranked_mmr?: number;
  peak_mmr?: number;
  casual_games?: number;
  is_admin?: boolean;
  country_code?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  has_customized_profile?: boolean;
  created_at?: string;
  updated_at?: string;
  // Coins & Collectibles
  total_coins?: number;
  lifetime_coins_earned?: number;
  // Email Preferences
  daily_email_subscribed?: boolean;
  timezone?: string | null;
  email_unsubscribe_token?: string | null;
  last_daily_email_sent_at?: string | null;
}

// Collectible item from the catalog
export interface CollectibleItem {
  id: string;
  name_key: string;
  description_key: string;
  icon: string;
  image_url?: string | null; // Optional image URL for the collectible
  category: 'avatar' | 'badge' | 'effect' | 'title';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  unlock_requirement?: {
    type: 'level' | 'achievement';
    value: number | string;
  } | null;
  sort_order: number;
  is_active: boolean;
}

// Player's owned collectible
export interface PlayerCollectible {
  id: string;
  collectible_id: string;
  acquired_at: string;
  is_equipped: boolean;
  equipped_slot?: string | null;
  // Joined from collectible_items
  collectible?: CollectibleItem;
}

export interface RankedProgress {
  user_id: string;
  casual_games_played: number;
  unlocked_at?: string | null;
  current_rating?: number;
  ranked_games_played?: number;
}

export interface AuthContextValue {
  // State
  user: User | null;
  profile: ProfileData | null;
  rankedProgress: RankedProgress | null;
  loading: boolean;
  isSupabaseEnabled: boolean;

  // Computed
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  canPlayRanked: boolean;
  gamesUntilRanked: number;
  needsProfileCustomization: boolean;

  // Actions
  setupProfile: (
    username: string,
    avatarEmoji?: string,
    avatarColor?: string
  ) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  updateProfile: (
    updates: Partial<ProfileData>
  ) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}
