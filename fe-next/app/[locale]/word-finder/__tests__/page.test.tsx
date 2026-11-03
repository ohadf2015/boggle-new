import { describe, expect, it } from 'vitest';
import { generateMetadata, faqs } from '../page';
import { buildFinderBody, canSearch } from '../finderRequest';
import { KNOWN_APP_ROOT_SEGMENTS } from '@/lib/seo/nextHandleGate';

const CANONICAL = 'https://www.lexiclash.live/en/word-finder';

describe('/word-finder metadata', () => {
  it('has a SERP-safe title and description aimed at the finder queries', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const title = String(meta.title);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.toLowerCase()).toContain('word finder');
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(CANONICAL);
    expect(meta.alternates?.languages).toEqual({ 'x-default': CANONICAL, en: CANONICAL });
  });

  it('keeps the other locales noindexed and canonical to English', async () => {
    for (const locale of ['he', 'sv', 'ja', 'es', 'ru']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe(CANONICAL);
    }
  });

  it('answers the position query in the FAQ', () => {
    expect(faqs.some((f) => /certain positions/i.test(f.q))).toBe(true);
    for (const f of faqs) expect(f.a.length).toBeGreaterThan(40);
  });

  it('is a known root segment so the request gate lets it through', () => {
    expect(KNOWN_APP_ROOT_SEGMENTS.has('word-finder')).toBe(true);
  });
});

describe('word finder request', () => {
  const empty = { letters: '', pattern: '', startsWith: '', endsWith: '', contains: '', length: null };

  it('searches with letters or a pattern, not with filters alone', () => {
    expect(canSearch(empty)).toBe(false);
    expect(canSearch({ ...empty, startsWith: 'cr' })).toBe(false);
    expect(canSearch({ ...empty, pattern: 'c_a_e' })).toBe(true);
    expect(canSearch({ ...empty, letters: 'ab' })).toBe(true);
  });

  it('sends only the filled fields, always in English', () => {
    expect(buildFinderBody({ ...empty, pattern: ' c_a_e ', letters: 'rt?', length: 5 })).toEqual({
      language: 'en',
      pattern: 'c_a_e',
      letters: 'rt?',
      length: 5,
    });
  });
});
