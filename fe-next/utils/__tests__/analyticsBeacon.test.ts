/**
 * Unload-safe write to /api/analytics/track. A pagehide handler is the last code
 * that runs, so the regular async fetch in growthTracking never leaves the
 * device; sendBeacon (or fetch keepalive) does.
 */

import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

vi.mock('../guestManager', () => ({
  getGuestSessionId: () => 'guest_123_abc',
  getGuestName: () => 'Fox',
}));
vi.mock('../utmCapture', () => ({
  getStoredUtmData: () => ({ utm_source: 'tiktok', utm_medium: 'social', utm_campaign: 'oct', referrer: 'https://t.co/x' }),
}));
vi.mock('@/utils/platform', () => ({ getPlatform: () => 'web' }));

import { persistEventBeacon } from '../analyticsBeacon';

async function readBody(blob: Blob): Promise<Record<string, unknown>> {
  return JSON.parse(await blob.text());
}

describe('persistEventBeacon', () => {
  const originalBeacon = navigator.sendBeacon;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.setItem('boggle_language', 'he');
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'sendBeacon', { value: originalBeacon, configurable: true, writable: true });
    globalThis.fetch = originalFetch;
    window.localStorage.clear();
  });

  it('sends the analytics_events row shape through sendBeacon', async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });

    persistEventBeacon('game_abandoned', { mode: 'classic', reason: 'pagehide', durationSec: 20 });

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe('/api/analytics/track');
    expect(blob.type).toBe('application/json');
    const body = await readBody(blob);
    expect(body).toMatchObject({
      event_type: 'game_abandoned',
      session_id: 'guest_123_abc',
      utm_source: 'tiktok',
      utm_medium: 'social',
      utm_campaign: 'oct',
      referrer: 'https://t.co/x',
      metadata: { mode: 'classic', reason: 'pagehide', durationSec: 20, platform: 'web', guest_name: 'Fox', language: 'he', transport: 'beacon' },
    });
  });

  it('falls back to fetch keepalive when sendBeacon is missing or refuses', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => false), configurable: true, writable: true });
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    persistEventBeacon('game_abandoned', { mode: 'blast' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/analytics/track');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(JSON.parse(init.body as string).metadata.transport).toBe('keepalive');
  });

  it('never throws when both transports fail', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: () => { throw new Error('nope'); }, configurable: true, writable: true });
    globalThis.fetch = (() => { throw new Error('offline'); }) as unknown as typeof fetch;

    expect(() => persistEventBeacon('game_abandoned', {})).not.toThrow();
  });
});
