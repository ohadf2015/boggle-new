/**
 * Admin Authentication Hook
 *
 * Manages JWT token lifecycle for admin API calls:
 * - Fetches initial token from Supabase session
 * - Automatically refreshes token every 50 minutes (before 1h expiration)
 * - Provides manual refresh function for 401 error recovery
 *
 * Uses TanStack Query's built-in retry with exponential backoff
 * instead of a custom retry loop.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import logger from '@/utils/logger';

const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes (before 1h expiration)

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
 * Fetch token from Supabase session (single attempt — retry handled by TanStack Query)
 */
async function fetchToken(): Promise<string | null> {
  const { data: { session } } = await getSession();

  if (!session?.access_token) {
    // Downgraded from warn → debug: fires on every guest visit to admin pages
    // (not an actionable error). The thrown Error still surfaces to callers.
    logger.debug('ADMIN_AUTH', 'No access token in session');
    throw new Error('Session not available - please log in again');
  }

  return session.access_token;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: queryKeys.adminAuth.token(),
    queryFn: fetchToken,
    staleTime: TOKEN_REFRESH_INTERVAL,
    refetchInterval: TOKEN_REFRESH_INTERVAL,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
  });

  const refreshToken = useCallback(async (): Promise<string | null> => {
    logger.debug('ADMIN_AUTH', 'Refreshing admin token');
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.adminAuth.token(),
      queryFn: fetchToken,
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
