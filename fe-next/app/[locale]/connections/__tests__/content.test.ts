import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_LANDING_LOCALES,
  getConnectionsLandingCopy,
  isSupportedLandingLocale,
} from '../content';

/**
 * The Connections landing was locked to en+he while sv/ja/es/ru each carried a
 * healthy puzzle pool (118/194/53/100 as of 2026-08-09) — four locales served
 * English copy behind a `noindex` + canonical→/en. These tests pin the fix and,
 * more importantly, catch the specific failure mode of adding a locale: writing
 * the copy file but forgetting to wire it into the switch, which silently falls
 * back to English and looks fine in every smoke test.
 */
describe('connections landing copy', () => {
  it('covers every locale with a puzzle pool that is actually playable', () => {
    // ja is excluded on purpose: PageClient walls off `locale === 'ja'`.
    // See the comment on SUPPORTED_LANDING_LOCALES in ../content.ts.
    expect([...SUPPORTED_LANDING_LOCALES].sort()).toEqual(['en', 'es', 'he', 'ru', 'sv'].sort());
  });

  it('does not advertise a locale the game refuses to render', () => {
    const pageClient = readFileSync(
      join(__dirname, '..', 'PageClient.tsx'),
      'utf8'
    );
    // Crude but load-bearing: if someone deletes the ja wall, this fails and
    // points at the one-line change that lets ja into the landing list.
    const jaIsWalled = /locale === 'ja'/.test(pageClient);
    expect(
      SUPPORTED_LANDING_LOCALES.includes('ja' as never),
      jaIsWalled
        ? 'ja is walled off in PageClient — it must not be a landing locale'
        : 'the ja wall is gone — add ja to SUPPORTED_LANDING_LOCALES'
    ).toBe(!jaIsWalled);
  });

  it('returns distinct copy per locale — never the English fallback', () => {
    const en = getConnectionsLandingCopy('en');
    for (const locale of SUPPORTED_LANDING_LOCALES) {
      if (locale === 'en') continue;
      const copy = getConnectionsLandingCopy(locale);
      expect(copy.metaTitle, `${locale} metaTitle is the EN fallback`).not.toBe(en.metaTitle);
      expect(copy.h1Pre, `${locale} h1Pre is the EN fallback`).not.toBe(en.h1Pre);
      expect(copy.faq.items[0]?.q, `${locale} FAQ is the EN fallback`).not.toBe(
        en.faq.items[0]?.q
      );
    }
  });

  it('still falls back to English for unsupported locales', () => {
    expect(getConnectionsLandingCopy('fr').metaTitle).toBe(
      getConnectionsLandingCopy('en').metaTitle
    );
    expect(isSupportedLandingLocale('fr')).toBe(false);
  });

  it('has the fields the page and its JSON-LD actually read', () => {
    for (const locale of SUPPORTED_LANDING_LOCALES) {
      const c = getConnectionsLandingCopy(locale);
      const required: [string, string][] = [
        ['metaTitle', c.metaTitle],
        ['metaDescription', c.metaDescription],
        ['metaKeywords', c.metaKeywords],
        ['ogTitle', c.ogTitle],
        ['ogDescription', c.ogDescription],
        ['twitterTitle', c.twitterTitle],
        ['twitterDescription', c.twitterDescription],
        ['h1Pre', c.h1Pre],
        ['h1Highlight', c.h1Highlight],
        ['introP1', c.introP1],
        ['ctaPrimary', c.ctaPrimary],
        ['videoGameName', c.videoGameName],
        ['videoGameDescription', c.videoGameDescription],
      ];
      for (const [field, value] of required) {
        expect(value?.trim(), `${locale}.${field} is empty`).toBeTruthy();
      }
      // FAQPage JSON-LD with one or two questions is a thin-content signal.
      expect(c.faq.items.length, `${locale} needs a real FAQ`).toBeGreaterThanOrEqual(4);
      for (const entry of c.faq.items) {
        expect(entry.q.trim(), `${locale} FAQ question empty`).toBeTruthy();
        expect(entry.a.trim(), `${locale} FAQ answer empty`).toBeTruthy();
      }
      expect(c.samples.items.length, `${locale} needs sample puzzles`).toBeGreaterThanOrEqual(3);
      expect(c.compare.rows.length, `${locale} needs a comparison table`).toBeGreaterThanOrEqual(3);
      expect(c.why.cards.length, `${locale} needs benefit cards`).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses each locale’s own script in its headline (not transliterated English)', () => {
    const scripts: Record<string, RegExp> = {
      he: /[֐-׿]/,
      ja: /[぀-ヿ一-鿿]/,
      ru: /[Ѐ-ӿ]/,
    };
    for (const [locale, re] of Object.entries(scripts)) {
      const c = getConnectionsLandingCopy(locale);
      expect(re.test(c.h1Pre + c.h1Highlight), `${locale} h1 is not in its own script`).toBe(true);
      expect(re.test(c.metaTitle), `${locale} metaTitle is not in its own script`).toBe(true);
    }
  });
});
