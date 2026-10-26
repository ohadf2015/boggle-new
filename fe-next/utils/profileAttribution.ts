/**
 * Persist first-touch attribution to the user's profile (t_a80f937b).
 *
 * Called once per genuine signup from AuthProvider's guest→authed transition
 * (covers OAuth callback, email-confirm return, and guest→permanent upgrade —
 * all resolve through the same session flip). Fire-and-forget: attribution
 * must never block or break the auth flow. The server route never overwrites
 * non-null profile columns, so repeats and races are harmless.
 */
import { supabase } from '@/lib/supabase';
import { getFirstTouchAttribution } from '@/utils/utmCapture';
import logger from '@/utils/logger';

export interface ProfileAttributionPayload {
  referrer_domain?: string | null;
  landing_path?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  signup_surface?: string | null;
}

/**
 * POST the stored first touch + signup surface to /api/auth/attribution.
 * Returns true when the server accepted the write. Never throws.
 */
export async function persistProfileAttribution(
  signupSurface: string | null,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const firstTouch = getFirstTouchAttribution();
  const payload: ProfileAttributionPayload = {
    referrer_domain: firstTouch?.referrer_domain ?? null,
    landing_path: firstTouch?.landing_path ?? null,
    utm_source: firstTouch?.utm_source ?? null,
    utm_medium: firstTouch?.utm_medium ?? null,
    utm_campaign: firstTouch?.utm_campaign ?? null,
    signup_surface: signupSurface,
  };

  // Nothing to persist — skip the round-trip.
  if (!firstTouch && !signupSurface) return false;

  try {
    // Attach a bearer token when a session is available so the route
    // authenticates even without cookie sync (Capacitor webview, strict
    // third-party cookie blocking). Cookie sessions still work without it.
    let accessToken: string | null = null;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      accessToken = data?.session?.access_token ?? null;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch('/api/auth/attribution', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn('[attribution] profile persist failed with status', res.status);
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('[attribution] profile persist error:', error);
    return false;
  }
}
