import type { NextRequest } from 'next/server';

/**
 * Same-origin check for CSRF defense on state-changing routes that can be
 * authenticated by an ambient cookie session.
 *
 * Compares the request's Origin (preferred) or Referer host against the host
 * the request was actually served on. A forged cross-site POST carries the
 * attacker's Origin, so it won't match. Bearer-token API callers send no
 * ambient credentials and so aren't CSRF-able, but they also legitimately may
 * omit Origin — those are allowed through here and still gated by auth.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!host) return false;

  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // No Origin header (e.g. non-browser API client). Fall back to Referer if present.
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // No Origin and no Referer — not a browser CSRF vector (browsers attach one
  // on cross-site POSTs). Allow; auth still applies.
  return true;
}
