/**
 * Regression: every season twist id must have a localized title + blurb in
 * ALL languages. The landing/banner components call t('season.twist.<id>.title')
 * with NO fallback arg, so a missing key pages Sentry (mandate: missing keys are
 * real bugs) AND shows English config text to non-en users. This test enumerates
 * twist ids dynamically via the catalog, so adding a new season twist without
 * translations fails CI here instead of in production.
 */
import { SEASON_CATALOG_SIZE, getSeasonTwist } from '../lib/seasons';

// Enumerate every distinct twist key from the live catalog (1-based season ids).
const TWIST_KEYS = Array.from(
  { length: SEASON_CATALOG_SIZE },
  (_, i) => getSeasonTwist(i + 1).key,
);

type TwistEntry = { title?: string; blurb?: string };
type SeasonShape = { season?: { twist?: Record<string, TwistEntry> } };

describe('season.twist translations', () => {
  it('catalog exposes 12 distinct twist keys', () => {
    expect(TWIST_KEYS.length).toBe(SEASON_CATALOG_SIZE);
    expect(new Set(TWIST_KEYS).size).toBe(SEASON_CATALOG_SIZE);
  });

  it.each(['en', 'he', 'es', 'ja', 'sv'])(
    '%s defines title+blurb for every season twist',
    async (lang) => {
      const mod: Record<string, Record<string, unknown>> = await import(`../translations/${lang}.js`);
      const t = mod[lang] as SeasonShape;
      const twist = t?.season?.twist;
      expect(twist).toBeDefined();

      for (const key of TWIST_KEYS) {
        const entry = twist?.[key];
        expect(entry, `${lang} missing season.twist.${key}`).toBeDefined();
        expect(entry?.title, `${lang} missing season.twist.${key}.title`).toBeTruthy();
        expect(entry?.blurb, `${lang} missing season.twist.${key}.blurb`).toBeTruthy();
      }
    },
  );
});
