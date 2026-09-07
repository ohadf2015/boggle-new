import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { manifestMatchesDisk, fingerprintSources, SOURCES_KEY } from '../i18nAssetFreshness';

const ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Regression guard for the hydration mismatch of 2026-09-06.
 *
 * `public/i18n/` is gitignored and only written by `scripts/build-i18n-assets.ts`,
 * but `lib/i18n/messagesManifest.json` is committed. `npm run dev` never ran the
 * builder, so a fresh worktree served `<script src="/i18n/en.<committed hash>.js">`
 * for a file that did not exist. The 404 left `globalThis.__LEXI_MESSAGES__`
 * unset, so on the client `getCachedTranslation()` returned undefined and `t()`
 * fell back to raw key paths — while the server, which reads the catalogue
 * through `require()`, rendered real text. React then reported
 * "Hydration failed because the server rendered text didn't match the client"
 * with `+ nav.quests` / `- Quests` inside GlobalBottomNav.
 */
describe('i18n asset wiring', () => {
  it('builds the hashed message catalogues before the dev server starts', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const dev = pkg.scripts.dev;

    // Either form is fine — what matters is that the assets named by the
    // committed manifest exist before the first page is served.
    expect(dev).toMatch(/build-i18n-assets|build:i18n/);
  });
});

describe('manifestMatchesDisk', () => {
  const manifest = { en: '/i18n/en.aaaa1111.js', he: '/i18n/he.bbbb2222.js' };

  it('is false when a manifest entry has no file on disk', () => {
    // The exact failure above: manifest committed, public/i18n empty.
    expect(manifestMatchesDisk(manifest, [])).toBe(false);
  });

  it('is false when the file on disk carries a different content hash', () => {
    const stale = ['en.99999999.js', 'en.99999999.js.br', 'he.bbbb2222.js', 'he.bbbb2222.js.br'];
    expect(manifestMatchesDisk(manifest, stale)).toBe(false);
  });

  it('is true when every entry is present with its brotli sibling', () => {
    const fresh = ['en.aaaa1111.js', 'en.aaaa1111.js.br', 'he.bbbb2222.js', 'he.bbbb2222.js.br'];
    expect(manifestMatchesDisk(manifest, fresh)).toBe(true);
  });

  it('still demands the brotli sibling when brotli was not skipped', () => {
    const noBrotli = ['en.aaaa1111.js', 'he.bbbb2222.js'];
    expect(manifestMatchesDisk(manifest, noBrotli)).toBe(false);
  });

  it('accepts a brotli-less build when brotli was skipped (dev)', () => {
    const noBrotli = ['en.aaaa1111.js', 'he.bbbb2222.js'];
    expect(manifestMatchesDisk(manifest, noBrotli, { skipBrotli: true })).toBe(true);
  });

  it('is false for an empty manifest, so a missing manifest never reads as fresh', () => {
    expect(manifestMatchesDisk({}, ['en.aaaa1111.js'])).toBe(false);
  });
});

/**
 * Second regression, found by the team lead the same day the first fix landed.
 *
 * The warm-start guard above compared disk against the MANIFEST, never against
 * the SOURCES. Builders added keys to `translations/*.js`; the next
 * `build:i18n` saw a manifest that still matched disk, skipped, and went on
 * serving a catalogue that predated the new keys. `wordTowerPractice` and
 * `teacher.proGate.analytics` rendered as raw keys in the browser — the exact
 * symptom the first fix removed, reintroduced by the skip.
 *
 * Freshness must therefore be keyed on a fingerprint of the build INPUTS,
 * recorded in the manifest at build time.
 */
describe('source fingerprinting', () => {
  const files = ['en.aaaa1111.js', 'en.aaaa1111.js.br', 'he.bbbb2222.js', 'he.bbbb2222.js.br'];
  const withSources = (fp: string) => ({
    en: '/i18n/en.aaaa1111.js',
    he: '/i18n/he.bbbb2222.js',
    [SOURCES_KEY]: fp,
  });

  it('produces a stable fingerprint for identical inputs', () => {
    expect(fingerprintSources(['a', 'b'])).toBe(fingerprintSources(['a', 'b']));
  });

  it('changes when any single input changes', () => {
    expect(fingerprintSources(['a', 'b'])).not.toBe(fingerprintSources(['a', 'b!']));
  });

  it('is order-sensitive, so callers must pass inputs in a fixed order', () => {
    expect(fingerprintSources(['a', 'b'])).not.toBe(fingerprintSources(['b', 'a']));
  });

  it('does not treat the sources key as a locale asset path', () => {
    // Without this, "__sources" would be looked for on disk as a filename.
    expect(manifestMatchesDisk(withSources('deadbeef'), files)).toBe(true);
  });

  it('is NOT fresh when the recorded fingerprint differs from the current sources', () => {
    // The regression, stated directly: assets on disk, manifest intact,
    // translations/*.js edited since.
    expect(
      manifestMatchesDisk(withSources('old-fingerprint'), files, {
        sourcesFingerprint: 'new-fingerprint',
      }),
    ).toBe(false);
  });

  it('is fresh when the recorded fingerprint matches the current sources', () => {
    expect(
      manifestMatchesDisk(withSources('same'), files, { sourcesFingerprint: 'same' }),
    ).toBe(true);
  });

  it('is NOT fresh when the manifest predates fingerprinting altogether', () => {
    // A manifest written by the old builder carries no __sources. It must
    // rebuild once to adopt the scheme rather than being trusted.
    const legacy = { en: '/i18n/en.aaaa1111.js', he: '/i18n/he.bbbb2222.js' };
    expect(manifestMatchesDisk(legacy, files, { sourcesFingerprint: 'anything' })).toBe(false);
  });
});
