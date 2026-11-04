// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SitemapPage from '../page';

async function hrefs(locale: string) {
  const { container } = render(await SitemapPage({ params: Promise.resolve({ locale }) }));
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
}

describe('HTML sitemap', () => {
  it.each(['en', 'ja', 'ru', 'es'])('links the hub pages Google only knew from the XML sitemap (%s)', async (locale) => {
    const links = await hrefs(locale);
    for (const path of ['/connections', '/daily/archive', '/tools', '/education/classroom-game', '/education/duels']) {
      expect(links).toContain(`/${locale}${path}`);
    }
  });

  it('links the most-read teacher help articles', async () => {
    expect(await hrefs('en')).toContain('/en/education/help/start-a-live-game');
  });
});
