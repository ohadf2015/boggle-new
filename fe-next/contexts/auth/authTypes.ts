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
  ranked_mmr?: number;
  casual_games?: number;
  is_admin?: boolean;
  country_code?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  created_at?: string;
  updated_at?: string;
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
