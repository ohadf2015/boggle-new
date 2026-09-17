/**
 * Pure path normalizer for page-presence tracking.
 *
 * Goals:
 *  - strip the `[locale]` prefix so `/he/play` and `/en/play` group together
 *  - drop query string + hash
 *  - collapse high-cardinality dynamic segments (ids, hashes) to `:id` so the
 *    admin view groups meaningfully and no PII (user ids) leaks into the label
 *
 * The length rule alone is not enough to tell an id from a route: `singleplayer`
 * (12), `lexiclash-vs-wordle` (19) and every blog slug are longer than a uuid's
 * first block, so a pure length test collapsed most of the site into `/:id` and
 * made the admin page panels show the same handful of labels forever. A
 * human-authored word slug is recognised first and kept verbatim.
 *
 * No React, no side effects — safe to unit test and to call on the server.
 */

const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

/** One hyphen-separated part of a word slug: a word, or a short number. */
const SLUG_PART = /^(?:[a-z]+\d{0,3}|\d{1,4})$/;

/**
 * A human-authored slug — `lexiclash-vs-wordle`, `i-waited-11-days`. Every part
 * has to read as a word (or a short number), so `room-a1b2c3d4` and a uuid,
 * which also contain hyphens, are NOT slugs.
 */
function looksLikeWordSlug(seg: string): boolean {
  const parts = seg.split('-');
  return parts.length >= 2 && parts.every((part) => SLUG_PART.test(part));
}

/**
 * Segments whose CHILD identifies a person. The readable-slug exemption below
 * must never apply there: `/u/somelongusername` has to stay `/u/:id` so no
 * username reaches an admin label.
 */
const IDENTITY_PARENTS = new Set(['u', 'player', 'players', 'guests', 'teacher']);

/** A segment looks like an opaque id if it's long and/or mixes digits. */
function isIdSegment(seg: string, parent?: string): boolean {
  // Anything under an identity route is an id, however readable it looks.
  if (parent && IDENTITY_PARENTS.has(parent)) return true;
  // A readable route or slug is never an id, however long it is.
  if (/^[a-z]+$/.test(seg)) return false; // `singleplayer`, `leaderboard`
  if (looksLikeWordSlug(seg)) return false;
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

  segments = segments.map((seg, i) => (isIdSegment(seg, segments[i - 1]) ? ':id' : seg));

  return '/' + segments.join('/');
}
