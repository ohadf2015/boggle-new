/**
 * The sitewide JSON-LD must name each language once.
 *
 * `app/[locale]/layout.tsx` built `inLanguage` as
 * `[languageCode, 'he', 'en', 'sv', 'ja', 'es', 'ru']` on both the WebApplication
 * and WebSite nodes. The spread already contains every locale, so the leading
 * `languageCode` is always a duplicate: `/he` shipped
 * `["he","he","en","sv","ja","es","ru"]` — seven entries for six languages, on
 * every page of the site. A repeated value in a schema.org array is not a hard
 * error, which is exactly why it survived; it is still a malformed list, and it is
 * the list that tells a crawler what languages this product exists in.
 *
 * The count is now derived from one constant, so the array cannot drift from the
 * locales we actually build, and a seventh entry cannot reappear.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HREFLANG_LOCALES } from '@/lib/seo/hreflang';

const FE_NEXT = join(__dirname, '..', '..', '..', '..');
const localeLayout = readFileSync(join(FE_NEXT, 'app', '[locale]', 'layout.tsx'), 'utf8');
const rootLayout = readFileSync(join(FE_NEXT, 'app', 'layout.tsx'), 'utf8');

describe('sitewide inLanguage', () => {
  it('is never written as a literal array with the locale prepended', () => {
    expect(localeLayout).not.toMatch(/inLanguage:\s*\[\s*languageCode\s*,/);
  });

  it('is built from the shared locale list', () => {
    const uses = localeLayout.match(/inLanguage:\s*SITE_LANGUAGES/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
  });

  it('names every built locale exactly once', () => {
    const match = localeLayout.match(/const SITE_LANGUAGES[^=]*= ([^;]+);/);
    expect(match, 'SITE_LANGUAGES constant').not.toBeNull();
    expect(match![1]).toContain('HREFLANG_LOCALES');
    // Derived from HREFLANG_LOCALES, so the set is whatever we actually build.
    expect(new Set(HREFLANG_LOCALES).size).toBe(HREFLANG_LOCALES.length);
    expect(HREFLANG_LOCALES.length).toBe(6);
  });
});

describe('root layout metadata', () => {
  /**
   * `app/layout.tsx` sets the default description plus the OpenGraph and Twitter
   * cards. It said "5 languages" in all three, so every page that does not
   * override them — the education hub and vocabulary-games-classroom among them —
   * served a share card contradicting its own body copy.
   */
  it('does not undercount the languages in metadata copy', () => {
    const offenders = rootLayout
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /\b(5|five)\s+languages\b/i.test(line))
      .map(({ line, n }) => `app/layout.tsx:${n}  ${line.trim().slice(0, 100)}`);
    expect(offenders.join('\n') || null).toBeNull();
  });

  it('states the count we actually ship', () => {
    expect(rootLayout).toMatch(/\b6 languages\b/);
  });
});
