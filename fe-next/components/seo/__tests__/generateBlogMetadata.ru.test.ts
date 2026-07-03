import { describe, expect, it } from 'vitest';
import { generateBlogMetadata } from '../BlogJsonLd';

// Articles with a native ru translation opt in via ruTranslated; everything
// else must keep ru out of hreflang (noindexed ru sibling in the cluster is
// an invalid-cluster signal in GSC).
describe('generateBlogMetadata — ru hreflang', () => {
  const base = {
    slug: 'free-word-games-online',
    locale: 'en',
    title: 't',
    description: 'd',
    datePublished: '2026-05-11',
  };

  it('includes ru + ru-RU alternates when ruTranslated', () => {
    const meta = generateBlogMetadata({ ...base, ruTranslated: true });
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;
    expect(languages.ru).toBe('https://www.lexiclash.live/ru/blog/free-word-games-online');
    expect(languages['ru-RU']).toBe('https://www.lexiclash.live/ru/blog/free-word-games-online');
  });

  it('omits ru alternates by default (untranslated articles)', () => {
    const meta = generateBlogMetadata(base);
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;
    expect(languages.ru).toBeUndefined();
    expect(languages['ru-RU']).toBeUndefined();
  });
});
