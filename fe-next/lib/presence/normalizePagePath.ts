/**
 * Pure path normalizer for page-presence tracking.
 *
 * Goals:
 *  - strip the `[locale]` prefix so `/he/play` and `/en/play` group together
 *  - drop query string + hash
 *  - collapse high-cardinality dynamic segments (ids, hashes) to `:id` so the
 *    admin view groups meaningfully and no PII (user ids) leaks into the label
 *
 * No React, no side effects — safe to unit test and to call on the server.
 */

const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

/** A segment looks like an opaque id if it's long and/or mixes digits. */
function isIdSegment(seg: string): boolean {
  if (seg.length >= 12) return true; // long hashes / uuids
  if (/\d/.test(seg) && /[a-zA-Z]/.test(seg) && seg.length >= 6) return true; // mixed alnum ids
  if (/^\d+$/.test(seg) && seg.length >= 4) return true; // long numeric ids
  return false;
}

export function normalizePagePath(input: string | null | undefined): string {
  if (!input) return '/';

  // Drop query + hash.
  let path = input.split('#')[0].split('?')[0];

  // Split into segments, dropping empties (handles leading/trailing slashes).
  let segments = path.split('/').filter(Boolean);

  // Strip a leading locale segment.
  if (segments.length > 0 && LOCALES.has(segments[0])) {
    segments = segments.slice(1);
  }

  if (segments.length === 0) return '/';

  segments = segments.map((seg) => (isIdSegment(seg) ? ':id' : seg));

  return '/' + segments.join('/');
}
