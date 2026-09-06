import { createHash } from 'node:crypto';

/**
 * Is the built i18n catalogue in `public/i18n/` still current?
 *
 * Two independent things can invalidate it, and BOTH have shipped as bugs:
 *
 * 1. The files the manifest names are absent. `lib/i18n/messagesManifest.json`
 *    is committed; the assets are gitignored and written only by
 *    `scripts/build-i18n-assets.ts`. A fresh worktree therefore had a manifest
 *    pointing at nothing, the `<head>` script 404'd, `__LEXI_MESSAGES__` was
 *    never assigned, and every client `t()` returned a raw key path while the
 *    server rendered real text — a hydration mismatch on every page.
 *
 * 2. The files are present and named correctly, but `translations/*.js` changed
 *    after they were built. Comparing disk against the manifest alone cannot
 *    see this: the manifest still matches, so the build is skipped and a stale
 *    catalogue keeps being served. New keys then render raw in the browser.
 *    This is why {@link fingerprintSources} exists and why the builder records
 *    the result under {@link SOURCES_KEY}.
 *
 * Both are the same silent-failure class: nothing errors, the page just quietly
 * shows key paths. Freshness has to be keyed on the build INPUTS, not on the
 * builder's own previous output.
 */

/**
 * Manifest key holding the fingerprint of the inputs that produced the assets.
 * Deliberately a string, not an object: `app/[locale]/layout.tsx` imports this
 * JSON and indexes it by locale, so keeping every value a string keeps the
 * inferred type `Record<string, string>` and that lookup well typed.
 */
export const SOURCES_KEY = '__sources';

/**
 * Fingerprint the builder's inputs — the six `translations/<locale>.js`
 * catalogues plus `i18n/normalizeMessages.ts`, which transforms them.
 *
 * Content-hashed rather than mtime-based on purpose: mtime changes on any
 * checkout, rebase or `touch`, which would force needless rebuilds, and it can
 * also go backwards, which would wrongly report fresh.
 *
 * Order-sensitive. Callers must pass inputs in a fixed order.
 */
export function fingerprintSources(contents: readonly string[]): string {
  const hash = createHash('sha256');
  for (const content of contents) {
    // Length-prefixed so ['ab','c'] and ['a','bc'] cannot collide.
    hash.update(String(content.length));
    hash.update('\0');
    hash.update(content);
  }
  return hash.digest('hex').slice(0, 16);
}

export interface FreshnessOptions {
  /**
   * Dev builds skip brotli (quality 11 over six catalogues is slow, and
   * `server/precompressedI18n.ts` falls back to gzip when `.br` is absent).
   * A build that skipped brotli must not be judged stale for that reason
   * alone — but a build that did NOT skip it must still carry every sibling,
   * or a production build would be allowed to ship without them.
   */
  skipBrotli?: boolean;
  /**
   * Fingerprint of the CURRENT sources, from {@link fingerprintSources}. When
   * given, the manifest must carry a matching one under {@link SOURCES_KEY};
   * a manifest written before fingerprinting existed carries none and is
   * therefore never fresh, so it rebuilds once to adopt the scheme.
   *
   * Omit only where source drift genuinely does not matter.
   */
  sourcesFingerprint?: string;
}

export function manifestMatchesDisk(
  manifest: Record<string, string>,
  filesOnDisk: readonly string[],
  { skipBrotli = false, sourcesFingerprint }: FreshnessOptions = {},
): boolean {
  const entries = Object.entries(manifest)
    .filter(([key]) => key !== SOURCES_KEY)
    .map(([, value]) => value);

  // An empty or unreadable manifest is never "fresh" — otherwise a missing
  // manifest would satisfy the guard and skip the build that creates it.
  if (entries.length === 0) return false;

  if (sourcesFingerprint !== undefined && manifest[SOURCES_KEY] !== sourcesFingerprint) {
    return false;
  }

  const present = new Set(filesOnDisk);

  return entries.every((entry) => {
    const file = entry.replace(/^\/i18n\//, '');
    if (!present.has(file)) return false;
    if (!skipBrotli && !present.has(`${file}.br`)) return false;
    return true;
  });
}
