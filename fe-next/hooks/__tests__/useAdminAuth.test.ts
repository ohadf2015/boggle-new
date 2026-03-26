/**
 * Tests for useAdminAuth hook
 * Verifies JWT token management for admin authentication
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initial token fetch', () => {
    test('should fetch token on mount', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

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
      // GIVEN: Supabase returns null session (will retry 3 times)
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      // Advance through retry delays (1s, 2s, 4s exponential backoff)
      // Total: 4 attempts (initial + 3 retries)
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

      // THEN: Error should be set after max retries
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('Session not available - please log in again');
      expect(loggerModule.default.warn).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'No access token after max retries'
      );
    });

    test('should handle session error via exception', async () => {
      // GIVEN: getSession throws an error (will retry 3 times)
      const sessionError = new Error('Session expired');
      (supabaseLib.getSession as any).mockRejectedValue(sessionError);

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

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

      // THEN: Error should be set after max retries
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('Session expired');
      expect(loggerModule.default.error).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        `Token fetch failed after max retries: Session expired`
      );
    });
  });

  describe('automatic token refresh', () => {
    test('should set up refresh interval when token is available', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      // Wait for initial token fetch
      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // THEN: Refresh interval should be set up
      expect(loggerModule.default.debug).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'Setting up token refresh every 50 minutes'
      );
    });

    test('should auto-refresh token after 50 minutes', async () => {
      // GIVEN: Supabase returns a valid session initially
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

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

      // WHEN: 50 minutes pass
      act(() => {
        vi.advanceTimersByTime(50 * 60 * 1000);
      });

      // THEN: Token should be refreshed
      await waitFor(() => {
        expect(result.current.authToken).toBe(newToken);
      });

      expect(loggerModule.default.debug).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'Auto-refreshing token'
      );
      expect(loggerModule.default.debug).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'Token refreshed successfully'
      );
    });

    test('should not set up refresh interval if no token', async () => {
      // GIVEN: Supabase returns null session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

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
      const { result } = renderHook(() => useAdminAuth());

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
      expect(result.current.authToken).toBe(newToken);
      expect(loggerModule.default.debug).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'Refreshing admin token'
      );
    });

    test('should set isRefreshing flag during manual refresh', async () => {
      // GIVEN: Supabase returns a valid session
      let resolveSession: (value: unknown) => void;
      const sessionPromise = new Promise((resolve) => {
        resolveSession = resolve;
      });

      (supabaseLib.getSession as any).mockReturnValue(sessionPromise);

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      // WHEN: Manual refresh is triggered (but not resolved yet)
      act(() => {
        result.current.refreshToken();
      });

      // THEN: isRefreshing should be true
      expect(result.current.isRefreshing).toBe(true);

      // WHEN: Promise resolves
      act(() => {
        resolveSession!({
          data: { session: mockSession },
          error: null,
        });
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      // THEN: isRefreshing should be false
      expect(result.current.isRefreshing).toBe(false);
    });

    test('should handle refresh failure', async () => {
      // GIVEN: Initial valid session
      (supabaseLib.getSession as any).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

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

      // WHEN: Manual refresh is triggered
      let refreshPromise: Promise<string | null>;
      act(() => {
        refreshPromise = result.current.refreshToken();
      });

      // Advance through retry delays (1s, 2s, 4s exponential backoff)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i));
          await Promise.resolve(); // Flush promises
        });
      }

      // Wait for refresh to complete
      const refreshedToken = await refreshPromise!;

      // THEN: Refresh should fail gracefully after retries
      expect(refreshedToken).toBeNull();
      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('cleanup', () => {
    test('should clear interval on unmount', async () => {
      // Spy on clearInterval before rendering
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result, unmount } = renderHook(() => useAdminAuth());

      // Wait for initial fetch and interval setup
      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // Clear previous spy calls (from interval setup)
      clearIntervalSpy.mockClear();

      // WHEN: Component unmounts
      unmount();

      // THEN: Interval should be cleared
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
