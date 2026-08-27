/**
 * Auth utility functions
 * Helper functions for authentication and profile setup
 */

import logger from '@/utils/logger';

/**
 * Fetch geolocation data from our API
 */
export async function fetchGeolocation(): Promise<{
  countryCode: string | null;
  country?: string;
  city?: string;
}> {
  try {
    const response = await fetch('/api/geolocation', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { countryCode: null };
    }
    const data = await response.json();
    return {
      countryCode: data.countryCode || null,
      country: data.country,
      city: data.city,
    };
  } catch (error) {
    logger.warn('Failed to fetch geolocation:', error);
    return { countryCode: null };
  }
}

/**
 * Extract display name from OAuth user metadata.
 * Handles Google (full_name, name), Discord (global_name, preferred_username, full_name),
 * and Apple (full_name, name) metadata shapes.
 */
export function extractOAuthDisplayName(
  userMetadata: Record<string, unknown> | undefined
): string | null {
  if (!userMetadata) return null;

  // Try standard fields first (Google, Apple)
  const fullName =
    (userMetadata.full_name as string) || (userMetadata.name as string);
  if (fullName) {
    // Extract first name, capitalize properly
    const firstName = fullName.split(' ')[0];
    if (/^[A-Z]+$/.test(firstName)) {
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return firstName;
  }

  // Discord: custom_claims.global_name or preferred_username
  const customClaims = userMetadata.custom_claims as Record<string, unknown> | undefined;
  if (customClaims?.global_name) return customClaims.global_name as string;
  if (userMetadata.preferred_username) return userMetadata.preferred_username as string;

  // Email prefix as last resort
  const email = userMetadata.email as string | undefined;
  if (email) return email.split('@')[0];

  return null;
}

// Locale-aware fallback names for when the random-name API fails.
// Witty single-or-two-word names with no dashes/underscores. Mirrors the
// style of BOT_CONFIG.PLAYER_NAMES so a fallback feels native, not jarring.
const FALLBACK_NAMES_BY_LANG: Record<string, string[]> = {
  en: [
    'Sneaky Pickle', 'Disco Potato', 'Cosmic Banana', 'Fluffy Waffle',
    'Peppy Penguin', 'Loopy Llama', 'Bouncy Bear', 'Sassy Sloth',
    'Quirky Quokka', 'Funky Flamingo', 'Wacky Walrus', 'Zesty Avocado',
  ],
  he: [
    'מלפפון חמקמק', 'בננה קוסמית', 'וופל פלאפי', 'פינגווין פפי',
    'למה לופי', 'דרקון מסוחרר', 'דוב קופצני', 'פלמינגו פאנקי',
    'עצלן חצוף', 'קואלה משונה', 'רקון רועש', 'שועל פיזי',
  ],
  sv: [
    'Smyg Gurka', 'Kosmisk Banan', 'Pigg Pingvin', 'Loopy Lama',
    'Yr Drake', 'Studsig Björn', 'Funky Flamingo', 'Fräck Sengångare',
    'Knasig Koala', 'Vild Tvättbjörn', 'Fräsig Räv', 'Glad Flodhäst',
  ],
  ja: [
    'こっそりピクルス', 'コズミックバナナ', 'ペッピーペンギン', 'ルーピーラマ',
    'くるくるドラゴン', 'ぴょんぴょんクマ', 'ファンキーフラミンゴ', 'おませなナマケモノ',
    'へんてこコアラ', 'やんちゃアライグマ', 'シュワシュワキツネ', 'ハッピーカバ',
  ],
  es: [
    'Pepino Astuto', 'Banana Cósmica', 'Pingüino Animado', 'Llama Chiflada',
    'Dragón Mareado', 'Oso Saltarín', 'Flamenco Funky', 'Perezoso Sassy',
    'Koala Raro', 'Mapache Ruidoso', 'Zorro Chispeante', 'Hippo Feliz',
  ],
};

function pickFallbackName(language: string): string {
  const pool = FALLBACK_NAMES_BY_LANG[language] ?? FALLBACK_NAMES_BY_LANG.en;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Fetch a random player name with suited avatar
 */
export async function fetchRandomPlayerName(
  language = 'en'
): Promise<{ name: string; avatar: { emoji: string; color: string } }> {
  try {
    const response = await fetch('/api/random-name?language=' + language, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch random name');
    }
    return await response.json();
  } catch (error) {
    logger.warn('Failed to fetch random name, using fallback:', error);
    return {
      name: pickFallbackName(language),
      avatar: { emoji: '😀', color: '#8B5CF6' },
    };
  }
}

/**
 * Fetch a random generic avatar for OAuth users
 * Generic avatars are neutral and work with any name
 */
export async function fetchRandomGenericAvatar(): Promise<{
  emoji: string;
  color: string;
}> {
  try {
    const response = await fetch('/api/random-avatar', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch random avatar');
    }
    const data = await response.json();
    return data.avatar;
  } catch (error) {
    logger.warn('Failed to fetch random avatar, using fallback:', error);
    return { emoji: '😊', color: '#8B5CF6' };
  }
}

/**
 * Supabase auth error types
 */
export interface SupabaseAuthError {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

/**
 * These fields are TYPED `string?` but arrive as whatever the rejected promise carried —
 * PostgREST errors use a numeric `code`, and a thrown non-auth object can hold anything.
 * `?.` only guards null/undefined, so `code.toLowerCase()` threw and the predicate meant to
 * CLASSIFY a failure became the failure (Sentry JAVASCRIPT-NEXTJS-21K, unhandled rejection).
 */
function lower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

/**
 * Check if error is a refresh token error
 */
export function isRefreshTokenError(
  error: SupabaseAuthError | null | undefined
): boolean {
  if (!error) return false;
  const errorCode = lower(error.code);
  const errorMessage = lower(error.message);
  return (
    errorCode === 'refresh_token_not_found' ||
    errorMessage.includes('refresh token not found') ||
    errorMessage.includes('invalid refresh token') ||
    errorCode === 'bad_jwt' ||
    errorMessage.includes('jwt expired') ||
    errorCode === 'token_expired' ||
    errorMessage.includes('token expired')
  );
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(
  error: SupabaseAuthError | null | undefined
): boolean {
  if (!error) return false;
  const errorMessage = lower(error.message);
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch')
  );
}

/**
 * Check if error is recoverable (can retry)
 */
export function isRecoverableError(
  error: SupabaseAuthError | null | undefined
): boolean {
  if (!error) return false;
  return isNetworkError(error) || error.status === 429 || error.status === 503;
}

/**
 * Get user-friendly error message
 */
export function getAuthErrorMessage(
  error: SupabaseAuthError | null | undefined
): string {
  if (!error) return 'An unknown error occurred';
  
  if (isRefreshTokenError(error)) {
    return 'Your session has expired. Please sign in again.';
  }
  
  if (isNetworkError(error)) {
    return 'Connection error. Please check your internet connection and try again.';
  }
  
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error.status === 503) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  return error.message || 'An authentication error occurred';
}
