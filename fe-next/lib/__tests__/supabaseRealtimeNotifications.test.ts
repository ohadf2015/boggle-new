import { vi, type Mock, } from 'vitest';
/**
 * Tests for supabaseRealtimeNotifications
 * Tests the notification subscription with error handling and fallback behavior
 */

import { subscribeToNotifications, fetchNotifications } from '../supabaseRealtimeNotifications';
import { createClient } from '@/utils/supabase/client';

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

describe('supabaseRealtimeNotifications', () => {
  let mockChannel: {
    on: Mock;
    subscribe: Mock;
  };
  let mockSupabase: {
    channel: Mock;
    removeChannel: Mock;
  };
  let subscribeCallback: ((status: string, err?: Error) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeCallback = null;

    // Setup mock channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      }),
    };

    // Setup mock Supabase client
    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    };

    (createClient as Mock).mockReturnValue(mockSupabase);
  });

  describe('subscribeToNotifications', () => {
    async function arm(userId: string, onNew = vi.fn(), onError?: (error: string) => void) {
      const cleanup = subscribeToNotifications(userId, onNew, onError);
      await vi.waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });
      return cleanup;
    }

    it('should return early if no userId provided', () => {
      // GIVEN: No user ID
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

      // WHEN: Subscribing with empty userId
      const cleanup = subscribeToNotifications('', vi.fn());

      // THEN: Should warn and return noop cleanup
      expect(warnSpy).toHaveBeenCalledWith('Cannot subscribe to notifications: no userId provided');
      expect(mockSupabase.channel).not.toHaveBeenCalled();
      cleanup(); // Should not throw
      warnSpy.mockRestore();
    });

    it('should create channel with correct name', async () => {
      const userId = 'user-123';
      await arm(userId);
      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`);
    });

    it('should subscribe to postgres_changes for user_notifications', async () => {
      const userId = 'user-456';
      await arm(userId);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        expect.any(Function)
      );
    });

    it('should log success on SUBSCRIBED status', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      await arm('user-123');
      subscribeCallback?.('SUBSCRIBED');
      expect(logSpy).toHaveBeenCalledWith('Subscribed to notifications channel');
      logSpy.mockRestore();
    });

    it('should handle mismatch error with log instead of error', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();
      const onError = vi.fn();
      await arm('user-123', vi.fn(), onError);
      const mismatchError = new Error('mismatch between server and client bindings');
      subscribeCallback?.('CHANNEL_ERROR', mismatchError);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Realtime subscription unavailable'));
      expect(errorSpy).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('mismatch between server and client bindings');
      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle regular channel errors with console.log', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const onError = vi.fn();
      await arm('user-123', vi.fn(), onError);
      subscribeCallback?.('CHANNEL_ERROR', new Error('Connection failed'));
      expect(logSpy).toHaveBeenCalledWith('[Notifications] Channel error (using polling fallback):', 'Connection failed');
      expect(onError).toHaveBeenCalledWith('Connection failed');
      logSpy.mockRestore();
    });

    it('should handle timeout with log and error callback', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const onError = vi.fn();
      await arm('user-123', vi.fn(), onError);
      subscribeCallback?.('TIMED_OUT');
      expect(logSpy).toHaveBeenCalledWith('[Notifications] Channel subscription timed out - will retry');
      expect(onError).toHaveBeenCalledWith('Subscription timed out');
      logSpy.mockRestore();
    });

    it('should remove channel on cleanup', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const cleanup = await arm('user-123');
      cleanup();
      expect(logSpy).toHaveBeenCalledWith('Unsubscribing from notifications channel');
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      logSpy.mockRestore();
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications from API', async () => {
      // GIVEN: API returns notifications
      let capturedUrl: string | null = null;
      server.use(
        http.get('*/api/player/notifications*', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            notifications: [{ id: '1', title: 'Test' }],
            unreadCount: 1,
            pagination: { total: 1 },
          });
        })
      );

      // WHEN: Fetching notifications
      const result = await fetchNotifications({ limit: 10 });

      // THEN: Should return notifications
      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(capturedUrl).toMatch(/\/api\/player\/notifications\?.*limit=10/);
    });

    it('should return empty result on fetch error', async () => {
      // GIVEN: API fails
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();
      server.use(
        http.get('*/api/player/notifications*', () => HttpResponse.error())
      );

      // WHEN: Fetching notifications
      const result = await fetchNotifications();

      // THEN: Should return empty result and log error
      expect(result.notifications).toEqual([]);
      expect(result.unreadCount).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith('Error fetching notifications:', expect.any(String));

      errorSpy.mockRestore();
    });

    it('should handle non-ok response', async () => {
      // GIVEN: API returns error status
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();
      server.use(
        http.get('*/api/player/notifications*', () => new HttpResponse(null, { status: 500 }))
      );

      // WHEN: Fetching notifications
      const result = await fetchNotifications();

      // THEN: Should return empty result
      expect(result.notifications).toEqual([]);
      expect(result.unreadCount).toBe(0);

      errorSpy.mockRestore();
    });
  });
});
