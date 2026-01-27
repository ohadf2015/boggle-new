/**
 * Tests for useAdminAuth hook
 * Verifies JWT token management for admin authentication
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminAuth } from '../useAdminAuth';
import * as supabaseLib from '@/lib/supabase';
import * as loggerModule from '@/utils/logger';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn(),
}));

// Mock logger
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
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
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initial token fetch', () => {
    test('should fetch token on mount', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
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
      // GIVEN: Supabase returns null session
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      }, { timeout: 3000 });

      // THEN: Error should be set
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('No access token available');
      expect(loggerModule.default.warn).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'No access token in session'
      );
    });

    test('should handle session error via exception', async () => {
      // GIVEN: getSession throws an error
      const sessionError = new Error('Session expired');
      (supabaseLib.getSession as jest.Mock).mockRejectedValue(sessionError);

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      }, { timeout: 3000 });

      // THEN: Error should be set
      expect(result.current.authToken).toBeNull();
      expect(result.current.error).toBe('Session expired');
      expect(loggerModule.default.error).toHaveBeenCalledWith(
        'ADMIN_AUTH',
        'Token fetch error: Session expired'
      );
    });
  });

  describe('automatic token refresh', () => {
    test('should set up refresh interval when token is available', async () => {
      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
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
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // Clear previous calls
      jest.clearAllMocks();

      // GIVEN: New token for refresh
      const newToken = 'refreshed-token-67890';
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: { ...mockSession, access_token: newToken },
        },
        error: null,
      });

      // WHEN: 50 minutes pass
      act(() => {
        jest.advanceTimersByTime(50 * 60 * 1000);
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
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.authToken).toBeNull();
      });

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
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // Clear previous calls
      jest.clearAllMocks();

      // GIVEN: New token for manual refresh
      const newToken = 'manually-refreshed-token';
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
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

      (supabaseLib.getSession as jest.Mock).mockReturnValue(sessionPromise);

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
      (supabaseLib.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.authToken).toBe(mockToken);
      });

      // GIVEN: Refresh fails
      (supabaseLib.getSession as jest.Mock).mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      // WHEN: Manual refresh is triggered
      let refreshedToken: string | null = null;
      await act(async () => {
        refreshedToken = await result.current.refreshToken();
      });

      // THEN: Refresh should fail gracefully
      expect(refreshedToken).toBeNull();
      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('cleanup', () => {
    test('should clear interval on unmount', async () => {
      // Spy on clearInterval before rendering
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // GIVEN: Supabase returns a valid session
      (supabaseLib.getSession as jest.Mock).mockResolvedValue({
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
