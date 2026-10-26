/**
 * Server-side sanitizers for first-touch attribution (t_a80f937b).
 *
 * Kept out of app/api/auth/attribution/route.ts because Next.js App Router
 * route files may only export HTTP verbs and config — extra named exports
 * fail the generated route type check in `next build`.
 *
 * The client sanitizes before sending (utils/utmCapture.ts); these are the
 * defensive second pass. Privacy rule: referrer is a bare DOMAIN and
 * landing_path is a path with utm_* params only — never full URLs, never
 * other query params.
 */

const UTM_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/** Reduce any referrer input to a bare hostname (client sends a domain already). */
export function sanitizeReferrerDomain(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.hostname || null;
  } catch {
    // Not URL-shaped at all — keep only a safe bare token, drop anything with path/query chars.
    return /^[a-z0-9.-]+$/i.test(trimmed) ? trimmed : null;
  }
}

/** Path + utm_* params only; rejects anything that is not an absolute path. */
export function sanitizeLandingPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;
  try {
    const url = new URL(trimmed, 'https://lexiclash.invalid');
    const kept = new URLSearchParams();
    for (const key of UTM_PARAM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) kept.set(key, value);
    }
    const qs = kept.toString();
    return qs ? `${url.pathname}?${qs}` : url.pathname;
  } catch {
    return null;
  }
}
