import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';
import {
  SUPPORTED_LANDING_LOCALES,
  getConnectionsLandingCopy,
  isSupportedLandingLocale,
} from '../content';

describe('connections page metadata', () => {
  it('returns indexable metadata for EN', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.title).toContain('Word Bridge');
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/connections');
  });

  it('returns Hebrew metadata for HE', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(String(meta.title)).toContain('ראש זנב');
    expect(meta.robots).toMatchObject({ index: true });
  });

  // These used to assert "sv/ja/es are noindex → canonical /en". All six locales
  // with a puzzle pool now have native landing copy, so assert the RELATIONSHIP
  // (indexable iff it has copy) rather than restating the list — a restated list
  // is what let page.tsx, content.ts and sitemap.ts drift apart before.
  it('self-canonicals and indexes every locale that has landing copy', async () => {
    for (const locale of SUPPORTED_LANDING_LOCALES) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots, `${locale} should be indexable`).toMatchObject({ index: true });
      expect(meta.alternates?.canonical, `${locale} should self-canonical`).toBe(
        `https://www.lexiclash.live/${locale}/connections`
      );
    }
  });

  it('noindexes a locale with no landing copy and canonicals it to /en', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) });
    expect(meta.robots).toMatchObject({ index: false });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/connections');
  });
});

describe('content module', () => {
  it('isSupportedLandingLocale agrees with SUPPORTED_LANDING_LOCALES', () => {
    for (const locale of SUPPORTED_LANDING_LOCALES) {
      expect(isSupportedLandingLocale(locale), `${locale} has copy`).toBe(true);
    }
    for (const locale of ['fr', 'de', 'xx']) {
      expect(isSupportedLandingLocale(locale), `${locale} has no copy`).toBe(false);
    }
  });

  it('falls back to EN copy for unknown locale', () => {
    const en = getConnectionsLandingCopy('en');
    const fallback = getConnectionsLandingCopy('xx');
    expect(fallback.h1Pre).toBe(en.h1Pre);
  });

  it('returns Hebrew copy for he', () => {
    const he = getConnectionsLandingCopy('he');
    expect(he.h1Pre).toMatch(/שתי/);
    expect(he.heClassic).not.toBeNull();
  });
});
