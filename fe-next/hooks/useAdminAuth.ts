/**
 * Admin Authentication Hook
 *
 * Manages JWT token lifecycle for admin API calls:
 * - Fetches initial token from Supabase session
 * - Automatically refreshes token every 50 minutes (before 1h expiration)
 * - Provides manual refresh function for 401 error recovery
 *
 * Usage:
 * ```tsx
 * const { authToken, refreshToken, isRefreshing } = useAdminAuth();
 *
 * // Use authToken in API calls
 * fetch('/api/admin/stats', {
 *   headers: { Authorization: `Bearer ${authToken}` }
 * });
 *
 * // Manually refresh on 401 error
 * if (response.status === 401) {
 *   await refreshToken();
 *   // Retry request with new token
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/supabase';
import logger from '@/utils/logger';

const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes (before 1h expiration)

interface UseAdminAuthReturn {
  /** Current JWT access token (null if not available) */
  authToken: string | null;
  /** Manually refresh the token (e.g., on 401 error) */
  refreshToken: () => Promise<string | null>;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Error message if token fetch/refresh failed */
  error: string | null;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch fresh token from Supabase session
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await getSession();

      if (!session?.access_token) {
        logger.warn('ADMIN_AUTH', 'No access token in session');
        setError('No access token available');
        return null;
      }

      setError(null);
      return session.access_token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('ADMIN_AUTH', `Token fetch error: ${message}`);
      setError(message);
      return null;
    }
  }, []);

  /**
   * Refresh token and update state
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!isMountedRef.current) return null;

    setIsRefreshing(true);
    logger.debug('ADMIN_AUTH', 'Refreshing admin token');

    const token = await fetchToken();

    if (isMountedRef.current) {
      setAuthToken(token);
      setIsRefreshing(false);

      if (token) {
        logger.debug('ADMIN_AUTH', 'Token refreshed successfully');
      }
    }

    return token;
  }, [fetchToken]);

  // Initial token fetch on mount
  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  // Set up automatic token refresh interval
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only set up refresh if we have a token
    if (authToken) {
      logger.debug('ADMIN_AUTH', `Setting up token refresh every ${TOKEN_REFRESH_INTERVAL / 60000} minutes`);

      refreshIntervalRef.current = setInterval(() => {
        logger.debug('ADMIN_AUTH', 'Auto-refreshing token');
        refreshToken();
      }, TOKEN_REFRESH_INTERVAL);
    }

    // Cleanup interval on unmount or token change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [authToken, refreshToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    authToken,
    refreshToken,
    isRefreshing,
    error,
  };
}
