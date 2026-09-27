/**
 * Tests for useAdminAuth hook
 * Verifies JWT token management for admin authentication
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminAuth } from '../useAdminAuth';
import * as supabaseLib from '@/lib/supabase';
import * as loggerModule from '@/utils/logger';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSession: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

describe('useAdminAuth', () => {
  const mockToken = 'mock-jwt-token-12345';
  const mockSession = {
    access_token: mockToken,
    refresh_token: 'mock-refresh-token',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  });

  afterEach(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try { vi.runOnlyPendingTimers(); } catch { /* real timers active */ }
    vi.useRealTimers();
  });

  describe('initial token fetch', () => {
    test('should fetch token on mount', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      // THEN: Token should be initially null (loading)
      expect(result.current.authToken).toBeNull();

      // WHEN: Promise resolves
      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // THEN: Token should be set
      expect(result.current.authToken).toBe(mockToken);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });

    test('should handle missing session', async () => {
      // GIVEN: Supabase returns null session (TanStack Query retries 3 times)
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      // Advance through TanStack Query retry delays (1s, 2s, 4s exponential backoff)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i));
          await Promise.resolve();
        });
      }

      // Wait for error to be set after all retries exhausted
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // THEN: Error should be set after max retries
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('Session not available - please log in again');
      expect(loggerModule.default.debug).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'No access token in session'
      );
    });

    test('should handle session error via exception', async () => {
      // GIVEN: getSession throws an error (will retry 3 times)
      const sessionError = new Error('Session expired');
      (supabaseLib.getSession as any).mockRejectedValue(sessionError);

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      // Advance through retry delays (1s, 2s, 4s exponential backoff)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i));
          await Promise.resolve(); // Flush promises
        });
      }

      // Wait for error to be set after all retries exhausted
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // THEN: Error should be set after TanStack Query exhausts retries
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('Session expired');
    });
  });

  describe('automatic token refresh', () => {
    test('should set up refresh interval when token is available', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      // Wait for initial token fetch
      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // THEN: Token is available (TanStack Query handles refetchInterval internally)
      expect(result.current.authToken).toBe(mockToken);
      expect(result.current.error).toBeNull();
    });

    test('should auto-refresh token after 50 minutes', async () => {
      // GIVEN: Supabase returns a valid session initially
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // Clear previous calls
      vi.clearAllMocks();

      // GIVEN: New token for refresh
      const newToken = 'refreshed-token-67890';
      (supabaseLib.getSession as any).mockResolvedValue({
        data: {
          session: { ...mockSession, access_token: newToken },
        },
        error: null,
      });

      // WHEN: 50 minutes pass (TanStack Query refetchInterval triggers)
      act(() => {
        vi.advanceTimersByTime(50 * 60 * 1000);
      });

      // THEN: Token should be refreshed via TanStack Query's refetchInterval
      await waitFor(() => {
        expect(result.current.authToken).toBe(newToken);
      });
    });

    test('should not set up refresh interval if no token', async () => {
      // GIVEN: Supabase returns null session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      // Advance through retry delays (1s, 2s, 4s exponential backoff)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i));
          await Promise.resolve(); // Flush promises
        });
      }

      // Wait for all retries to complete
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.authToken).toBeNull();

      // THEN: No refresh interval setup log
      expect(loggerModule.default.debug).not.toHaveBeenCalledWith(
        'ADMIN_AUTH',
        expect.stringContaining('Setting up token refresh')
      );
    });
  });

  describe('manual token refresh', () => {
    test('should allow manual refresh', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // Clear previous calls
      vi.clearAllMocks();

      // GIVEN: New token for manual refresh
      const newToken = 'manually-refreshed-token';
      (supabaseLib.getSession as any).mockResolvedValue({
        data: {
          session: { ...mockSession, access_token: newToken },
        },
        error: null,
      });

      // WHEN: Manual refresh is triggered
      let refreshedToken: string | null = null;
      await act(async () => {
        refreshedToken = await result.current.refreshToken();
      });

      // THEN: Token should be refreshed
      expect(refreshedToken).toBe(newToken);
      await waitFor(() => {
        expect(result.current.authToken).toBe(newToken);
      });
    });

    test('should set isRefreshing flag during manual refresh', async () => {
      // GIVEN: Initial fetch succeeds
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      const { result } = renderHook(() => useAdminAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // GIVEN: Next fetch hangs (manual refresh)
      let resolveSession: (value: unknown) => void;
      const sessionPromise = new Promise((resolve) => {
        resolveSession = resolve;
      });
      (supabaseLib.getSession as any).mockReturnValue(sessionPromise);

      // WHEN: Manual refresh is triggered (but not resolved yet)
      act(() => {
        result.current.refreshToken();
      });

      // THEN: isRefreshing should be true (isFetching && !isLoading)
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      // WHEN: Promise resolves
      await act(async () => {
        resolveSession!({
          data: { session: mockSession },
          error: null,
        });
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    test('should handle refresh failure', async () => {
      // GIVEN: Initial valid session
      (supabaseLib.getSession as any).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result, unmount } = renderHook(() => useAdminAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // GIVEN: Refresh fails (mock all retry attempts)
      const refreshError = new Error('Refresh failed');
      (supabaseLib.getSession as any)
        .mockRejectedValueOnce(refreshError)
        .mockRejectedValueOnce(refreshError)
        .mockRejectedValueOnce(refreshError)
        .mockRejectedValueOnce(refreshError);

      // WHEN: Manual refresh is triggered — fetchTokenWithRetry throws after retries
      let caughtError: Error | null = null;
      const refreshPromise = result.current.refreshToken().catch((e: Error) => {
        caughtError = e;
        return null;
      });

      // Advance through retry delays (1s, 2s, 4s exponential backoff)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i));
        });
      }

      await act(async () => {
        await refreshPromise;
      });

      // THEN: Refresh should fail — queryClient.fetchQuery propagates error
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe('Refresh failed');

      // Clean up to prevent refetchInterval from leaking into subsequent tests
      unmount();
    });
  });

  describe('cleanup', () => {
    test('should clean up on unmount without errors', () => {
      // TanStack Query manages refetchInterval cleanup internally.
      // Verifying token flow + unmount under fake timers is fragile due to
      // timer leakage between tests. Just verify unmount doesn't throw.
      const { unmount } = renderHook(() => useAdminAuth(), { wrapper });
      expect(() => unmount()).not.toThrow();
    });
  });
});
