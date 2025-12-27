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
      name: 'Player ' + Math.floor(Math.random() * 1000),
      avatar: { emoji: '😀', color: '#6366f1' },
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
    return { emoji: '😊', color: '#6366f1' };
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
 * Check if error is a refresh token error
 */
export function isRefreshTokenError(
  error: SupabaseAuthError | null | undefined
): boolean {
  if (!error) return false;
  const errorCode = error.code?.toLowerCase() || '';
  const errorMessage = error.message?.toLowerCase() || '';
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
  const errorMessage = error.message?.toLowerCase() || '';
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
