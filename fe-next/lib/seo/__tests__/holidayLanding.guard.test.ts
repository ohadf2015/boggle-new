import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { HOLIDAY_LANDINGS, landingAlternates, landingPath, landingUrl } from '@/lib/holidays/landing';
import { KNOWN_APP_ROOT_SEGMENTS, decideNextHandle } from '../nextHandleGate';

const LOCALE_DIR = path.resolve(__dirname, '../../../app/[locale]');
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

describe('holiday landing pages reach Next', () => {
  it.each(HOLIDAY_LANDINGS.map((p) => [landingPath(p), p.slug]))('%s passes the pre-Next gate for users and crawlers', (url, slug) => {
    expect(KNOWN_APP_ROOT_SEGMENTS.has(slug)).toBe(true);
    expect(decideNextHandle(url)).toEqual({ action: 'pass' });
    expect(decideNextHandle(url, GOOGLEBOT)).toEqual({ action: 'pass' });
    expect(decideNextHandle(`${url}?holiday=christmas`, GOOGLEBOT)).toEqual({ action: 'pass' });
  });

  it.each(HOLIDAY_LANDINGS.map((p) => [p.slug]))('app/[locale]/%s/page.tsx renders its own registry row', (slug) => {
    const src = fs.readFileSync(path.join(LOCALE_DIR, slug, 'page.tsx'), 'utf8');
    expect(src).toContain(`landingBySlug('${slug}')`);
  });

  it('lists every landing once in the sitemap, only in its own locale, with cross-language hreflang', () => {
    const entries = sitemap();
    for (const p of HOLIDAY_LANDINGS) {
      const hits = entries.filter((e) => e.url.endsWith(`/${p.slug}`));
      expect(hits.map((e) => e.url), p.slug).toEqual([landingUrl(p)]);
      expect(hits[0].alternates?.languages).toEqual(landingAlternates(p));
    }
  });
});
