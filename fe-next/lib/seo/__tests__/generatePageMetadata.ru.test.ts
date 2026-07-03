import { describe, expect, it } from 'vitest';
import { generatePageMetadata } from '../generatePageMetadata';

// ru locale launched 2026-06-30; this helper's LOCALES list must include it so
// ru pages get ru-localized metadata + every page's hreflang cluster points at
// the /ru sibling (Class-3 asymmetry guard).
describe('generatePageMetadata — ru locale', () => {
  it('treats ru as a valid locale (not en fallback) and emits ru + ru-RU alternates', async () => {
    const meta = await generatePageMetadata({ seoKey: 'contact', path: '/contact', locale: 'ru' });
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;
    expect(languages.ru).toBe('https://www.lexiclash.live/ru/contact');
    expect(languages['ru-RU']).toBe('https://www.lexiclash.live/ru/contact');
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/ru/contact');
  });

  it('includes ru alternate when rendering other locales', async () => {
    const meta = await generatePageMetadata({ seoKey: 'contact', path: '/contact', locale: 'en' });
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;
    expect(languages.ru).toBe('https://www.lexiclash.live/ru/contact');
  });
});
