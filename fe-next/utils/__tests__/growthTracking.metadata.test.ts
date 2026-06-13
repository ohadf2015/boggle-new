/**
 * Analytics Metadata Enrichment Tests
 *
 * Verifies that every analytics event persisted to Supabase carries:
 * 1. platform: 'ios' | 'android' | 'web'
 * 2. guest_name: string | null (for guests only)
 * 3. error_reason?: string (optional, for error scenarios)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/utmCapture', () => ({
  getStoredUtmData: vi.fn(() => ({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { /* noop */ }
  }
  // Reset fetch mock for each test
  global.fetch = vi.fn();
});

describe('Analytics Metadata Enrichment', () => {
  describe('1. Platform Detection', () => {
    it('injects platform into metadata for game_completed events', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'ios'),
        isNative: vi.fn(() => true),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);

      // Wait for fetch to be called (fire-and-forget)
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"platform":"ios"'),
        })
      );
    });

    it('injects platform=web when not native', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"platform":"web"'),
        })
      );
    });

    it('injects platform for game_abandoned events', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'android'),
        isNative: vi.fn(() => true),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 50, 2, false);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"platform":"android"'),
        })
      );
    });
  });

  describe('2. Guest Name Tracking', () => {
    it('includes guest_name in metadata when guest has a name', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const { setGuestName } = await import('../guestManager');

      setGuestName('Guest_Alice');

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"guest_name":"Guest_Alice"'),
        })
      );
    });

    it('includes null guest_name when guest has no name set', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"guest_name":null'),
        })
      );
    });

    it('preserves guest_name across multiple game events', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const { setGuestName } = await import('../guestManager');

      setGuestName('Guest_Bob');

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);
      await new Promise(resolve => setTimeout(resolve, 10));

      mockFetch.mockClear();

      trackGameEnd('multiplayer', 200, 8, true);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"guest_name":"Guest_Bob"'),
        })
      );
    });
  });

  describe('3. Error Reason Tracking', () => {
    it('includes error_reason when passed in extras', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 0, 0, false, 5, {
        errorReason: 'connection_lost',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"errorReason":"connection_lost"'),
        })
      );
    });

    it('includes error_reason from trackGameError helper', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameError } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameError('singleplayer', 'crash_detected');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"error_reason":"crash_detected"'),
        })
      );
    });

    it('sets completed=false for error game_abandoned events', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameError } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameError('singleplayer', 'out_of_memory');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should emit game_abandoned
      expect(capture).toHaveBeenCalledWith(
        'game_abandoned',
        expect.objectContaining({
          error_reason: 'out_of_memory',
        })
      );
    });

    it('does not include error_reason when not provided', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);

      await new Promise(resolve => setTimeout(resolve, 10));

      const calls = mockFetch.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      const body = lastCall[1]?.body as string;
      expect(body).not.toContain('error_reason');
    });
  });

  describe('Integration: All Three Metadata Fields Together', () => {
    it('includes platform + guest_name + error_reason in single event', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'android'),
        isNative: vi.fn(() => true),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const { setGuestName } = await import('../guestManager');

      setGuestName('Guest_Charlie');

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 0, 0, false, 3, {
        errorReason: 'disconnected',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      expect(callBody).toContain('"platform":"android"');
      expect(callBody).toContain('"guest_name":"Guest_Charlie"');
      expect(callBody).toContain('"errorReason":"disconnected"');
    });
  });

  describe('Auth header — server verifies identity, not the body', () => {
    it('attaches the bearer token when a session exists', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));
      vi.doMock('@/lib/supabase', () => ({
        getSession: vi.fn(async () => ({ data: { session: { access_token: 'jwt-abc' } } })),
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer jwt-abc');
    });

    it('omits the Authorization header for guests (no session)', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));
      vi.doMock('@/lib/supabase', () => ({
        getSession: vi.fn(async () => ({ data: { session: null } })),
      }));

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Language stamping — every event carries the UI locale', () => {
    // The admin game log reads metadata.language for the flag. game_started call
    // sites passed { language }; game_completed call sites did NOT, so completed
    // events (the terminal row the log displays) had no language and rendered as
    // English. Stamp the current UI locale centrally so ALL events carry it.
    it('injects the stored UI language into metadata for game_completed', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));
      window.localStorage.setItem('boggle_language', 'he');

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = mockFetch.mock.calls[0][1]?.body as string;
      expect(body).toContain('"language":"he"');
    });

    it('prefers an explicit language passed by the caller over the stored locale', async () => {
      vi.doMock('@/utils/platform', () => ({
        getPlatform: vi.fn(() => 'web'),
        isNative: vi.fn(() => false),
        isAndroid: vi.fn(() => false), // awardGameEnd no-ops off Android (metadata test, not play-games)
      }));
      window.localStorage.setItem('boggle_language', 'en');

      const { trackGameEnd } = await import('../growthTracking');
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      trackGameEnd('singleplayer', 100, 5, true, 60, { language: 'ja' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = mockFetch.mock.calls[0][1]?.body as string;
      expect(body).toContain('"language":"ja"');
    });
  });
});
