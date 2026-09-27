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

    it('should create channel with correct name', () => {
      // GIVEN: A valid user ID
      const userId = 'user-123';

      // WHEN: Subscribing to notifications
      subscribeToNotifications(userId, vi.fn());

      // THEN: Should create channel with user-specific name
      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`);
    });

    it('should subscribe to postgres_changes for user_notifications', () => {
      // GIVEN: A valid user ID
      const userId = 'user-456';

      // WHEN: Subscribing to notifications
      subscribeToNotifications(userId, vi.fn());

      // THEN: Should configure postgres_changes listener
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

    it('should log success on SUBSCRIBED status', () => {
      // GIVEN: A subscription
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      subscribeToNotifications('user-123', vi.fn());

      // WHEN: Subscription succeeds
      subscribeCallback?.('SUBSCRIBED');

      // THEN: Should log success
      expect(logSpy).toHaveBeenCalledWith('Subscribed to notifications channel');
      logSpy.mockRestore();
    });

    it('should handle mismatch error with log instead of error', () => {
      // GIVEN: A subscription with error callback
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();
      const onError = vi.fn();

      subscribeToNotifications('user-123', vi.fn(), onError);

      // WHEN: Channel error with mismatch message occurs
      const mismatchError = new Error('mismatch between server and client bindings');
      subscribeCallback?.('CHANNEL_ERROR', mismatchError);

      // THEN: Should log (not error) and call error callback
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Realtime subscription unavailable'));
      expect(errorSpy).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('mismatch between server and client bindings');

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle regular channel errors with console.log', () => {
      // GIVEN: A subscription with error callback
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const onError = vi.fn();

      subscribeToNotifications('user-123', vi.fn(), onError);

      // WHEN: Regular channel error occurs
      const regularError = new Error('Connection failed');
      subscribeCallback?.('CHANNEL_ERROR', regularError);

      // THEN: Should log (not warn — non-fatal, polling fallback handles it) and call error callback
      expect(logSpy).toHaveBeenCalledWith('[Notifications] Channel error (using polling fallback):', 'Connection failed');
      expect(onError).toHaveBeenCalledWith('Connection failed');

      logSpy.mockRestore();
    });

    it('should handle timeout with log and error callback', () => {
      // GIVEN: A subscription with error callback
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const onError = vi.fn();

      subscribeToNotifications('user-123', vi.fn(), onError);

      // WHEN: Subscription times out
      subscribeCallback?.('TIMED_OUT');

      // THEN: Should log (not warn) and call error callback
      expect(logSpy).toHaveBeenCalledWith('[Notifications] Channel subscription timed out - will retry');
      expect(onError).toHaveBeenCalledWith('Subscription timed out');

      logSpy.mockRestore();
    });

    it('should remove channel on cleanup', () => {
      // GIVEN: A subscription
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const cleanup = subscribeToNotifications('user-123', vi.fn());

      // WHEN: Cleanup is called
      cleanup();

      // THEN: Should remove channel
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
