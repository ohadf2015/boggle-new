// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { generateMetadata } from './page';

describe('/en/scrabble-alternative-online metadata', () => {
  it('returns indexable metadata for en locale with TM-safe title', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.title).toMatch(/Scrabble Alternative/i);
    expect(meta.title).not.toMatch(/^Scrabble Online$/i);
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/scrabble-alternative-online');
  });

  it('returns noindex for non-en locales (locale-gate pattern)', async () => {
    for (const locale of ['es', 'he', 'sv', 'ja']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
    }
  });

  it('description front-loads "Scrabble alternative" for SERP CTR', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.description).toMatch(/scrabble-?alternative/i);
  });
});
