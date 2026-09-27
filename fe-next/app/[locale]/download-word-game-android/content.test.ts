import { describe, it, expect } from 'vitest';
import { getDownloadLandingCopy, type DownloadLandingCopy, type Locale } from './content';

const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

const SCALAR_FIELDS: (keyof DownloadLandingCopy)[] = [
  'metaTitle', 'metaDescription', 'metaKeywords',
  'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription',
  'badge', 'h1Pre', 'h1Highlight', 'introP1', 'introP2', 'heroImageAlt',
  'installCtaLabel', 'installCtaAria', 'playWebLabel',
  'featuresHeading', 'featuresSub',
  'comparisonHeading', 'comparisonFooter',
  'installHeading', 'faqHeading', 'relatedHeading',
  'finalCtaHeading', 'finalCtaBody',
  'appName', 'appDescription',
];

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
}

describe('getDownloadLandingCopy', () => {
  it('falls back to English for an unknown locale', () => {
    expect(getDownloadLandingCopy('xx')).toEqual(getDownloadLandingCopy('en'));
  });

  LOCALES.forEach((locale) => {
    describe(`locale: ${locale}`, () => {
      const copy = getDownloadLandingCopy(locale);

      it('populates every required scalar field with non-empty text', () => {
        for (const field of SCALAR_FIELDS) {
          const v = copy[field];
          expect(typeof v, `${String(field)} should be a string`).toBe('string');
          expect((v as string).trim().length, `${String(field)} empty in ${locale}`).toBeGreaterThan(0);
        }
      });

      it('has well-formed content arrays', () => {
        expect(copy.marqueeBadges.length).toBe(6);
        expect(copy.features.length).toBeGreaterThanOrEqual(4);
        expect(copy.features.length).toBeLessThanOrEqual(6);
        copy.features.forEach((f) => {
          expect(f.icon.length).toBeGreaterThan(0);
          expect(f.title.trim().length).toBeGreaterThan(0);
          expect(f.blurb.trim().length).toBeGreaterThan(0);
        });

        expect(copy.comparisonHeaders.length).toBe(3);
        expect(copy.comparisonRows.length).toBeGreaterThanOrEqual(4);
        copy.comparisonRows.forEach((row) => expect(row.length).toBe(3));

        expect(copy.installSteps.length).toBeGreaterThanOrEqual(3);
        expect(copy.installSteps.length).toBeLessThanOrEqual(4);
        copy.installSteps.forEach((s) => {
          expect(s.title.trim().length).toBeGreaterThan(0);
          expect(s.sub.trim().length).toBeGreaterThan(0);
        });

        expect(copy.faqs.length).toBeGreaterThanOrEqual(6);
        copy.faqs.forEach((f) => {
          expect(f.q.trim().length).toBeGreaterThan(0);
          expect(f.a.trim().length).toBeGreaterThan(0);
        });

        expect(copy.related.length).toBe(4);
        copy.related.forEach((r) => {
          expect(r.title.trim().length).toBeGreaterThan(0);
          expect(r.sub.trim().length).toBeGreaterThan(0);
          expect(r.hrefSuffix.startsWith('/')).toBe(true);
        });
      });

      it('contains no placeholder text', () => {
        const all: string[] = [];
        collectStrings(copy, all);
        const joined = all.join(' ');
        // Match real placeholder markers, not legitimate words like Spanish "todo".
        expect(joined).not.toMatch(/\bTODO\b/);
        expect(joined).not.toMatch(/\bTBD\b/);
        expect(joined).not.toMatch(/lorem ipsum/i);
        expect(joined).not.toMatch(/\bplaceholder\b/i);
        expect(joined).not.toMatch(/\bXXX+\b/);
      });
    });
  });
});
