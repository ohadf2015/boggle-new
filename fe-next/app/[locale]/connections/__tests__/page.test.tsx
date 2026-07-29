import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';
import { getConnectionsLandingCopy, isSupportedLandingLocale } from '../content';

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

  it('noindexes sv/ja/es and canonicals to /en/connections', async () => {
    for (const locale of ['sv', 'ja', 'es']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toMatchObject({ index: false });
      expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/connections');
    }
  });
});

describe('content module', () => {
  it('isSupportedLandingLocale matches en+he only', () => {
    expect(isSupportedLandingLocale('en')).toBe(true);
    expect(isSupportedLandingLocale('he')).toBe(true);
    expect(isSupportedLandingLocale('sv')).toBe(false);
    expect(isSupportedLandingLocale('ja')).toBe(false);
    expect(isSupportedLandingLocale('es')).toBe(false);
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
