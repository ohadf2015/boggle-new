import { describe, it, expect } from 'vitest';
import { seoContent } from '../seoContent';

/**
 * The homepage FAQ is a single source: it renders as visible prose in
 * HomepageContentSection AND as the FAQPage JSON-LD emitted by page.tsx.
 *
 * Before 2026-08-25 the JSON-LD came from a second, divergent copy
 * (lib/seo/homepageFaqJsonLd.ts) whose first four questions only branched on
 * `he`/`ru` — so https://www.lexiclash.live/es and /sv shipped English FAQ
 * answers inside their structured data (verified live by curl on 2026-08-25).
 * These tests fail if either half of that regresses.
 */
describe('homepage seoContent.faq', () => {
  const locales = Object.keys(seoContent);

  it('covers every locale the homepage renders', () => {
    expect(locales.sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });

  it.each(locales)('%s has at least 5 FAQ entries', (locale) => {
    expect(seoContent[locale].faq.length).toBeGreaterThanOrEqual(5);
  });

  it.each(locales.filter((l) => l !== 'en'))(
    '%s serves no English FAQ copy',
    (locale) => {
      const english = new Set(
        seoContent.en.faq.flatMap((item) => [item.question, item.answer]),
      );
      for (const item of seoContent[locale].faq) {
        expect(english.has(item.question)).toBe(false);
        expect(english.has(item.answer)).toBe(false);
      }
    },
  );

  it.each(locales)('%s has no empty question or answer', (locale) => {
    for (const item of seoContent[locale].faq) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });
});
