import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

async function metaFor(locale: string) {
  return generateMetadata({ params: Promise.resolve({ locale }) });
}

describe('/daily-word-wheel metadata', () => {
  it('sv snippet leads with the searcher words and fits the SERP', async () => {
    const meta = await metaFor('sv');
    const title = String(meta.title);
    expect(title.startsWith('Ordhjulet')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
    const description = String(meta.description);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).not.toContain('strek');
  });

  it.each(LOCALES)('%s has a non-empty title and description', async (locale) => {
    const meta = await metaFor(locale);
    expect(String(meta.title)).toContain('LexiClash');
    expect(String(meta.description).length).toBeGreaterThan(50);
  });
});
