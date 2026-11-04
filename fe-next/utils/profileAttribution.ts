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
  language?: string | null;
  country_code?: string | null;
}

export interface AttributionExtras {
  /** raw_user_meta_data from the signup, present even in a different browser. */
  metadata?: Record<string, unknown> | null;
  language?: string | null;
  countryCode?: string | null;
}

function metaStr(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * POST the stored first touch + signup surface to /api/auth/attribution.
 * Returns true when the server accepted the write. Never throws.
 */
export async function persistProfileAttribution(
  signupSurface: string | null,
  extras?: AttributionExtras,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const firstTouch = getFirstTouchAttribution();
  const meta = extras?.metadata ?? null;
  const surface = signupSurface || metaStr(meta, 'signup_surface');
  const payload: ProfileAttributionPayload = {
    referrer_domain: firstTouch?.referrer_domain ?? metaStr(meta, 'referrer_domain'),
    landing_path: firstTouch?.landing_path ?? metaStr(meta, 'landing_path'),
    utm_source: firstTouch?.utm_source ?? metaStr(meta, 'utm_source'),
    utm_medium: firstTouch?.utm_medium ?? metaStr(meta, 'utm_medium'),
    utm_campaign: firstTouch?.utm_campaign ?? metaStr(meta, 'utm_campaign'),
    signup_surface: surface,
    language: extras?.language ?? metaStr(meta, 'language'),
    country_code: extras?.countryCode ?? metaStr(meta, 'country_code'),
  };

  // Nothing to persist — skip the round-trip. Metadata from a cross-browser
  // confirm counts: the local first-touch is gone, the account still has it.
  if (!Object.values(payload).some((value) => value)) return false;

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

    // The profile row is created by a trigger that can lose the race with
    // this POST. One retry on 404; anything else fails closed.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('/api/auth/attribution', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.status === 404 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      if (!res.ok) {
        if (res.status !== 401) logger.warn('[attribution] profile persist failed with status', res.status);
        return false;
      }
      return true;
    }
    return false;
  } catch (error) {
    logger.warn('[attribution] profile persist error:', error);
    return false;
  }
}
