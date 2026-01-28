import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import type { ProfileData, RankedProgress } from '@/contexts/auth/authTypes';
import { broadcastSignedOut } from '@/utils/crossTabAuthSync';
import { locales } from './i18n';
import { isNative } from '@/utils/platform';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('Supabase credentials not configured. Auth features will be disabled.');
}

// Browser client using @supabase/ssr for proper cookie-based session handling
// CRITICAL: detectSessionInUrl must be false to prevent race condition in auth callback
// When true (default), Supabase auto-detects and exchanges the auth code in background,
// which races with our manual exchangeCodeForSession() call in the callback page.
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    })
  : null;

// Helper to get the current locale from the URL path
function getCurrentLocale(): string | null {
  if (typeof window === 'undefined') return null;
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }
  return null;
}

// Auth helper functions
// NOTE: For mobile (Capacitor), use performMobileOAuth() from utils/mobileOAuth.ts
// instead of these functions directly. The useOAuthSignIn hook handles this automatically.
export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  // Include current locale in the callback URL so we can redirect back correctly
  const currentLocale = getCurrentLocale();

  // Use deep link scheme for native apps, web URL for browser
  // Note: On mobile, useOAuthSignIn uses performMobileOAuth instead of this function
  const redirectUrl = isNative()
    ? 'lexiclash://auth/callback' + (currentLocale ? `?locale=${currentLocale}` : '')
    : new URL('/auth/callback' + (currentLocale ? `?locale=${currentLocale}` : ''), window.location.origin).toString();

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl }
  });
}

export async function signInWithDiscord() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  // Include current locale in the callback URL so we can redirect back correctly
  const currentLocale = getCurrentLocale();

  // Use deep link scheme for native apps, web URL for browser
  // Note: On mobile, useOAuthSignIn uses performMobileOAuth instead of this function
  const redirectUrl = isNative()
    ? 'lexiclash://auth/callback' + (currentLocale ? `?locale=${currentLocale}` : '')
    : new URL('/auth/callback' + (currentLocale ? `?locale=${currentLocale}` : ''), window.location.origin).toString();

  return supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: redirectUrl }
  });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  // Include current locale in the callback URL so we can redirect back correctly
  const currentLocale = getCurrentLocale();
  const redirectUrl = new URL('/auth/callback', window.location.origin);
  if (currentLocale) {
    redirectUrl.searchParams.set('locale', currentLocale);
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl.toString(),
    },
  });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  // Broadcast sign out to other tabs before signing out
  // This ensures other tabs clear their state immediately
  broadcastSignedOut();

  // Use global scope to sign out from all tabs/sessions
  return supabase.auth.signOut({ scope: 'global' });
}

export async function getSession() {
  if (!supabase) return { data: { session: null } };
  return supabase.auth.getSession();
}

export async function getUser() {
  if (!supabase) return { data: { user: null } };
  return supabase.auth.getUser();
}

// Profile helpers
type ProfileResult = { data: ProfileData | null; error: { message: string } | null };

/**
 * Profile field selectors to reduce over-fetching
 * Use the minimal selector needed for your view
 */
export const PROFILE_SELECTS = {
  // Minimal fields for display (avatars, cards, leaderboards)
  minimal: 'id, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url',
  // Overview fields for profile cards and summaries
  overview: 'id, username, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, total_games, total_score, current_level, player_title',
  // Game-related stats for results and stats pages
  stats: 'id, display_name, total_games, total_score, total_words, casual_games, casual_wins, ranked_games, ranked_wins, ranked_mmr, peak_mmr, longest_word, longest_word_length, total_xp, current_level, player_title, achievement_counts, total_time_played',
  // Auth and settings fields
  settings: 'id, username, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, profile_picture_provider, has_customized_profile, is_admin, country_code, daily_email_subscribed, timezone',
  // Full profile (use sparingly - only when all fields needed)
  full: 'id, username, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, profile_picture_provider, has_customized_profile, total_games, total_score, total_words, casual_games, casual_wins, ranked_games, ranked_wins, ranked_mmr, peak_mmr, longest_word, longest_word_length, total_xp, current_level, player_title, is_admin, total_hints_used, free_hints_available, country_code, created_at, updated_at, achievement_counts, total_time_played, total_coins, lifetime_coins_earned, daily_email_subscribed, timezone, gift_modal_dismissed_at'
} as const;

export type ProfileSelectType = keyof typeof PROFILE_SELECTS;

/**
 * Get profile with specific field selection to reduce over-fetching
 * @param userId - User ID to fetch
 * @param select - Which field set to fetch (default: 'full' for backward compatibility)
 */
export async function getProfile(userId: string, select: ProfileSelectType = 'full'): Promise<ProfileResult> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const result = await supabase
    .from('profiles')
    .select(PROFILE_SELECTS[select])
    .eq('id', userId)
    .single();
  return { data: result.data as ProfileData | null, error: result.error ? { message: result.error.message } : null };
}

export async function updateProfile(userId: string, updates: Partial<ProfileData>): Promise<ProfileResult> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const result = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data: result.data as ProfileData | null, error: result.error ? { message: result.error.message } : null };
}

export async function createProfile(profile: Partial<ProfileData>): Promise<ProfileResult> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const result = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  return { data: result.data as ProfileData | null, error: result.error ? { message: result.error.message } : null };
}


// Leaderboard helpers - used by backend and hooks
export async function getLeaderboard(limit = 100, offset = 0) {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };
  return supabase
    .from('leaderboard')
    .select('id, player_id, username, display_name, avatar_emoji, avatar_color, total_score, games_played, games_won, ranked_mmr, rank_position, total_xp, current_level')
    .order('total_score', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function getUserRank(userId: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('leaderboard')
    .select('rank_position, total_score, games_played')
    .eq('player_id', userId)
    .maybeSingle();
}

// Guest token helpers - used by backend

export async function getGuestToken(tokenHash: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .select('id, token_hash, stats, claimed_by, created_at, updated_at')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .single();
}

// Used by backend and components/views/ResultsPage.tsx
export async function updateGuestStats(tokenHash: string, stats: Record<string, any>) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .update({ stats })
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .select()
    .single();
}

export async function claimGuestToken(tokenHash: string, userId: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .update({ claimed_by: userId })
    .eq('token_hash', tokenHash)
    .select()
    .single();
}

// Ranked progress helpers
type RankedProgressResult = { data: RankedProgress | null; error: { message: string } | null };

export async function getRankedProgress(userId: string): Promise<RankedProgressResult> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const result = await supabase
    .from('ranked_progress')
    .select('id, player_id, casual_games_played, unlocked_at')
    .eq('player_id', userId)
    .maybeSingle();

  // Map player_id to user_id to match RankedProgress interface
  if (result.data) {
    return {
      data: {
        user_id: result.data.player_id,
        casual_games_played: result.data.casual_games_played,
        unlocked_at: result.data.unlocked_at,
      },
      error: null,
    };
  }
  return { data: null, error: result.error ? { message: result.error.message } : null };
}

export async function isSupabaseConfigured(): Promise<boolean> {
  return !!supabase;
}


// Profile picture storage functions
export async function uploadProfilePicture(userId: string, file: File) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/profile.${fileExt}`;

  // Remove any existing profile pictures for this user
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const filesToRemove = extensions.map(ext => `${userId}/profile.${ext}`);
  await supabase.storage.from('profile_pictures').remove(filesToRemove);

  // Upload new file
  const { error } = await supabase.storage
    .from('profile_pictures')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) return { url: null, error };

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('profile_pictures')
    .getPublicUrl(fileName);

  // Add cache-busting timestamp
  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  return { url: urlWithCacheBust, error: null };
}

export async function removeProfilePicture(userId: string) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const filesToRemove = extensions.map(ext => `${userId}/profile.${ext}`);

  const { error } = await supabase.storage
    .from('profile_pictures')
    .remove(filesToRemove);

  return { error };
}

// Coin management functions
export interface CoinSyncResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Sync coins to the database (add coins to user's balance)
 * This should be called after awarding coins locally to persist them
 * Uses RPC for atomic operation (single query instead of 3)
 */
export async function syncCoinsToDatabase(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, string | number>
): Promise<CoinSyncResult> {
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };

  try {
    const { data, error } = await supabase.rpc('sync_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: metadata || {}
    });

    if (error) {
      logger.error('Coin sync RPC error:', error);
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return { success: false, error: result?.error_message || 'Unknown error' };
    }

    return { success: true, newBalance: result.new_balance };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Coin sync error:', error);
    return { success: false, error };
  }
}

/**
 * Spend coins from user's balance (deduct coins)
 * Returns success if user has enough coins, false otherwise
 * Uses RPC for atomic operation (single query instead of 3)
 */
export async function spendCoinsFromDatabase(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, string | number>
): Promise<CoinSyncResult> {
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };

  try {
    // Use negative amount for spending
    const { data, error } = await supabase.rpc('sync_coins', {
      p_user_id: userId,
      p_amount: -amount,
      p_reason: reason,
      p_metadata: metadata || {}
    });

    if (error) {
      logger.error('Coin spend RPC error:', error);
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return { success: false, error: result?.error_message || 'Unknown error' };
    }

    return { success: true, newBalance: result.new_balance };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error };
  }
}

/**
 * Get user's coin balance from database
 */
export async function getDatabaseCoinBalance(userId: string): Promise<{ coins: number; lifetime: number } | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_coins, lifetime_coins_earned')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      coins: data.total_coins || 0,
      lifetime: data.lifetime_coins_earned || 0
    };
  } catch {
    return null;
  }
}
