import { describe, it, expect } from 'vitest';
import { decideNextHandle } from '@/lib/seo/nextHandleGate';
import { GET as feedGET, generateStaticParams } from '../../../app/[locale]/blog/feed.xml/route';
import { GET as newsGET } from '../../../app/news-sitemap.xml/route';

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });

describe('blog feed and news sitemap routes', () => {
  it('serves each locale feed as RSS and 404s a locale without one', async () => {
    const res = await feedGET(new Request('https://www.lexiclash.live/he/blog/feed.xml'), params('he'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/rss+xml');
    expect(await res.text()).toContain('<rss version="2.0"');

    const missing = await feedGET(new Request('https://www.lexiclash.live/fr/blog/feed.xml'), params('fr'));
    expect(missing.status).toBe(404);
    expect(generateStaticParams().map((p) => p.locale)).toContain('ja');
  });

  it('serves the news sitemap as XML', async () => {
    const res = newsGET();
    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(await res.text()).toContain('xmlns:news=');
  });

  // The prod Express gate 404s unknown paths before Next sees them.
  it('lets both URLs through the pre-Next gate', () => {
    expect(decideNextHandle('/news-sitemap.xml')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/en/blog/feed.xml', 'Googlebot')).toEqual({ action: 'pass' });
  });
});
