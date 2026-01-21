'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ADMIN_API_TIMEOUT, type AdminApiResponse } from '@/lib/admin';

/**
 * Configuration options for useAdminOperation
 */
interface UseAdminOperationOptions<T> {
  /** API endpoint path (e.g., '/api/admin/words') */
  endpoint: string;
  /** HTTP method (default: 'GET') */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Automatically fetch on mount (default: false) */
  autoFetch?: boolean;
  /** Request timeout in ms (default: ADMIN_API_TIMEOUT) */
  timeout?: number;
  /** Transform response data */
  transformResponse?: (data: unknown) => T;
  /** Callback on successful operation */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Initial data value */
  initialData?: T;
}

/**
 * Return type for useAdminOperation
 */
interface UseAdminOperationResult<T> {
  /** The response data */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Execute the operation with optional body */
  execute: (body?: Record<string, unknown>) => Promise<T | null>;
  /** Refresh data (re-fetch for GET operations) */
  refresh: () => Promise<T | null>;
  /** Clear error state */
  clearError: () => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for admin API operations with automatic auth handling
 *
 * Provides:
 * - Automatic Supabase auth token injection
 * - Standardized error handling
 * - Request timeout support
 * - Loading state management
 *
 * @example
 * // GET request with auto-fetch
 * const { data, isLoading, error, refresh } = useAdminOperation<WordData[]>({
 *   endpoint: '/api/admin/words',
 *   autoFetch: true,
 * });
 *
 * @example
 * // POST request
 * const { execute, isLoading, error } = useAdminOperation({
 *   endpoint: '/api/admin/words',
 *   method: 'POST',
 *   onSuccess: () => toast.success('Word created'),
 * });
 * await execute({ word: 'hello', language: 'en' });
 */
export function useAdminOperation<T = unknown>(
  options: UseAdminOperationOptions<T>
): UseAdminOperationResult<T> {
  const {
    endpoint,
    method = 'GET',
    autoFetch = false,
    timeout = ADMIN_API_TIMEOUT,
    transformResponse,
    onSuccess,
    onError,
    initialData,
  } = options;

  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabase = createClient();

  const execute = useCallback(
    async (body?: Record<string, unknown>): Promise<T | null> => {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      setIsLoading(true);
      setError(null);

      try {
        // Get auth session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          const errorMsg = 'Not authenticated. Please refresh the page.';
          setError(errorMsg);
          onError?.(errorMsg);
          return null;
        }

        // Build request options
        const requestOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
          requestOptions.body = JSON.stringify(body);
        }

        // Make request
        const response = await fetch(endpoint, requestOptions);
        const responseData = (await response.json()) as AdminApiResponse<T>;

        if (!response.ok) {
          const errorMsg = responseData.error || `Request failed with status ${response.status}`;
          setError(errorMsg);
          onError?.(errorMsg);
          return null;
        }

        // Transform and set data
        const resultData = transformResponse
          ? transformResponse(responseData.data ?? responseData)
          : ((responseData.data ?? responseData) as T);

        setData(resultData);
        onSuccess?.(resultData);
        return resultData;
      } catch (err) {
        // Handle abort (timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          const errorMsg = 'Request timed out. Please try again.';
          setError(errorMsg);
          onError?.(errorMsg);
          return null;
        }

        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [endpoint, method, timeout, transformResponse, onSuccess, onError, supabase]
  );

  const refresh = useCallback(() => execute(), [execute]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setData(initialData ?? null);
    setIsLoading(false);
    setError(null);
  }, [initialData]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && method === 'GET') {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    refresh,
    clearError,
    reset,
  };
}

/**
 * Simplified hook for admin mutations (POST/PUT/DELETE)
 * Wraps useAdminOperation with common mutation patterns
 *
 * @example
 * const { mutate, isLoading, error } = useAdminMutation({
 *   endpoint: '/api/admin/words',
 *   method: 'POST',
 *   onSuccess: (data) => {
 *     toast.success('Created!');
 *     refreshList();
 *   },
 * });
 */
export function useAdminMutation<T = unknown>(
  options: Omit<UseAdminOperationOptions<T>, 'autoFetch'>
): {
  mutate: (body: Record<string, unknown>) => Promise<T | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
} {
  const { execute, isLoading, error, clearError } = useAdminOperation<T>({
    ...options,
    autoFetch: false,
  });

  return {
    mutate: execute,
    isLoading,
    error,
    clearError,
  };
}

export default useAdminOperation;
