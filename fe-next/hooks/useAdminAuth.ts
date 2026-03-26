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

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

/**
 * Fetch fresh token from Supabase session with retry logic
 */
async function fetchTokenWithRetry(): Promise<string | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const { data: { session } } = await getSession();

      if (!session?.access_token) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.debug('ADMIN_AUTH', `No access token, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        logger.warn('ADMIN_AUTH', 'No access token after max retries');
        throw new Error('Session not available - please log in again');
      }

      return session.access_token;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.debug('ADMIN_AUTH', `Token fetch error, retrying in ${delayMs}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  const message = lastError?.message || 'Unknown error';
  logger.error('ADMIN_AUTH', `Token fetch failed after max retries: ${message}`);
  throw new Error(message);
}

export function useAdminAuth(): UseAdminAuthReturn {
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ['admin-auth-token'],
    queryFn: fetchTokenWithRetry,
    staleTime: TOKEN_REFRESH_INTERVAL,
    refetchInterval: TOKEN_REFRESH_INTERVAL,
    retry: false, // retry logic is inside fetchTokenWithRetry
  });

  const refreshToken = useCallback(async (): Promise<string | null> => {
    logger.debug('ADMIN_AUTH', 'Refreshing admin token');
    const result = await queryClient.fetchQuery({
      queryKey: ['admin-auth-token'],
      queryFn: fetchTokenWithRetry,
      staleTime: 0, // force fresh fetch
    });
    return result;
  }, [queryClient]);

  return {
    authToken: tokenQuery.data ?? null,
    refreshToken,
    isLoading: tokenQuery.isLoading,
    isRefreshing: tokenQuery.isFetching && !tokenQuery.isLoading,
    error: tokenQuery.error?.message ?? null,
  };
}
