import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';
import { faqs } from '../faqs';

describe('/wordscapes-alternative', () => {
  it('Given en locale, When metadata is built, Then it is indexable, canonical and SERP-sized', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(String(meta.title)).toMatch(/^Wordscapes Alternative/);
    expect(String(meta.title).length).toBeLessThanOrEqual(60);
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/wordscapes-alternative');
  });

  it('Given a non-en locale, When metadata is built, Then it is noindex', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'es' }) });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('targets the intended search queries in the FAQ', () => {
    const text = faqs.map((f) => f.q.toLowerCase()).join(' ');
    expect(text).toContain('wordscapes alternative');
    expect(text).toContain('without ads');
  });
});
