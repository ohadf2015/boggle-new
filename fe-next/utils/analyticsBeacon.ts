/**
 * Unload-safe write to /api/analytics/track.
 *
 * growthTracking's persistToSupabase awaits an auth token before its fetch, so
 * from a pagehide / visibilitychange handler the request never leaves the device.
 * This path is synchronous: sendBeacon first, fetch keepalive as the fallback.
 * No bearer header can ride a beacon, so authed rows land with player_id null and
 * are joined back through session_id (the guest id every client keeps).
 */

import { getGuestSessionId, getGuestName } from './guestManager';
import { getStoredUtmData } from './utmCapture';
import { getPlatform } from '@/utils/platform';

const TRACK_URL = '/api/analytics/track';

function currentLanguage(): string | null {
  try {
    const stored = window.localStorage.getItem('boggle_language');
    if (stored) return stored;
  } catch {
    /* localStorage unavailable */
  }
  return document.documentElement.lang || null;
}

function buildBody(event: string, data: Record<string, unknown>, transport: 'beacon' | 'keepalive') {
  const utm = getStoredUtmData();
  return JSON.stringify({
    event_type: event,
    session_id: getGuestSessionId(),
    utm_source: utm?.utm_source || utm?.ref || null,
    utm_medium: utm?.utm_medium || null,
    utm_campaign: utm?.utm_campaign || null,
    referrer: utm?.referrer || null,
    metadata: {
      ...data,
      platform: getPlatform(),
      guest_name: getGuestName(),
      language: currentLanguage(),
      transport,
    },
  });
}

export function persistEventBeacon(event: string, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([buildBody(event, data, 'beacon')], { type: 'application/json' });
      if (navigator.sendBeacon(TRACK_URL, blob)) return;
    }
  } catch {
    // fall through to keepalive
  }
  try {
    const p = fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: buildBody(event, data, 'keepalive'),
      keepalive: true,
    });
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // analytics never block the exit path
  }
}
