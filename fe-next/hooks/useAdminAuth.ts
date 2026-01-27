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
const MAX_RETRY_ATTEMPTS = 3; // Maximum retries for initial token fetch
const RETRY_DELAY_MS = 1000; // Base delay between retries (exponential backoff)

interface UseAdminAuthReturn {
  /** Current JWT access token (null if not available) */
  authToken: string | null;
  /** Manually refresh the token (e.g., on 401 error) */
  refreshToken: () => Promise<string | null>;
  /** Whether initial token fetch is in progress */
  isLoading: boolean;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Error message if token fetch/refresh failed */
  error: string | null;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Track initial load
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);

  /**
   * Fetch fresh token from Supabase session with retry logic
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const { data: { session } } = await getSession();

        if (!session?.access_token) {
          // No session available
          if (attempt < MAX_RETRY_ATTEMPTS) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
            logger.debug('ADMIN_AUTH', `No access token in session, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // Try again
          }

          // Max retries exceeded - set error
          logger.warn('ADMIN_AUTH', 'No access token after max retries');
          setError('Session not available - please log in again');
          return null;
        }

        // Success - clear error and return token
        setError(null);
        retryCountRef.current = 0;
        return session.access_token;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');

        // Log and retry
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.debug('ADMIN_AUTH', `Token fetch error, retrying in ${delayMs}ms: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Try again
        }
      }
    }

    // Max retries exceeded
    const message = lastError?.message || 'Unknown error';
    logger.error('ADMIN_AUTH', `Token fetch failed after max retries: ${message}`);
    setError(message);
    return null;
  }, []);

  /**
   * Refresh token and update state
   */
  const refreshToken = useCallback(async (isInitialLoad = false): Promise<string | null> => {
    if (!isMountedRef.current) return null;

    setIsRefreshing(true);
    if (isInitialLoad) {
      setIsLoading(true);
    }
    logger.debug('ADMIN_AUTH', 'Refreshing admin token');

    const token = await fetchToken();

    if (isMountedRef.current) {
      setAuthToken(token);
      setIsRefreshing(false);
      if (isInitialLoad) {
        setIsLoading(false);
      }

      if (token) {
        logger.debug('ADMIN_AUTH', 'Token refreshed successfully');
      }
    }

    return token;
  }, [fetchToken]);

  // Initial token fetch on mount
  useEffect(() => {
    refreshToken(true); // isInitialLoad = true
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
    isLoading,
    isRefreshing,
    error,
  };
}
