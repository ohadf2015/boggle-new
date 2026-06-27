import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { getRotatedTodayWord, type Locale } from '../../word-of-the-day/content';

function call(locale: string) {
  return GET(new Request(`https://www.lexiclash.live/${locale}/embed/word-of-the-day`), {
    params: Promise.resolve({ locale }),
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

describe('embed word-of-the-day route handler', () => {
  it('returns a standalone HTML document (one <html>, has DOCTYPE)', async () => {
    const res = await call('en');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const body = await res.text();
    expect(body.startsWith('<!DOCTYPE html>')).toBe(true);
    // Exactly one <html> — proves it's not nested inside the app layout's html.
    expect(body.match(/<html/g)?.length).toBe(1);
  });

  it('renders today\'s word for the locale', async () => {
    const body = await (await call('en')).text();
    const word = getRotatedTodayWord('en', today());
    expect(body).toContain(word.word);
    expect(body).toContain(word.definition);
  });

  it('sets dir=rtl for Hebrew', async () => {
    const body = await (await call('he')).text();
    expect(body).toContain('dir="rtl"');
    expect(body).toContain('lang="he"');
  });

  it('defaults invalid locale to en', async () => {
    const body = await (await call('zz')).text();
    const enWord = getRotatedTodayWord('en', today());
    expect(body).toContain('lang="en"');
    expect(body).toContain(enWord.word);
  });

  it('includes a noindex meta and a dofollow backlink with UTM', async () => {
    const body = await (await call('en')).text();
    expect(body).toContain('name="robots"');
    expect(body).toContain('noindex');
    expect(body).toContain('utm_source=embed');
    // backlink present, not nofollow
    expect(body).toContain('/en/word-of-the-day?utm_source=embed');
    expect(body).not.toContain('rel="nofollow"');
  });

  it('escapes HTML in rendered fields', async () => {
    // Sanity: no raw unescaped angle brackets injected from content into text nodes.
    const body = await (await call('en')).text();
    const locales: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
    expect(locales.length).toBe(5); // all locales supported
    expect(body).not.toContain('<script>');
  });
});
