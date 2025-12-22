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
 * Check if error is a refresh token error
 */
export function isRefreshTokenError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const errorCode = error.code?.toLowerCase() || '';
  const errorMessage = error.message?.toLowerCase() || '';
  return (
    errorCode === 'refresh_token_not_found' ||
    errorMessage.includes('refresh token not found') ||
    errorMessage.includes('invalid refresh token') ||
    errorCode === 'bad_jwt' ||
    errorMessage.includes('jwt expired')
  );
}
