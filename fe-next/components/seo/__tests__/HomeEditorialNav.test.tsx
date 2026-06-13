// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HomeEditorialNav, HOME_EDITORIAL_LOCALES } from '../HomeEditorialNav';

describe('HomeEditorialNav', () => {
  // A reviewer's "is this a game or a publisher?" judgment is formed on landing.
  // This server-rendered strip surfaces the editorial surface (guides/blog/about)
  // at the TOP of the homepage DOM so it appears in the crawler's first paint —
  // not buried below the game canvas or only in the footer.
  it('renders a labelled nav with links to the core editorial pages', () => {
    const { container } = render(<HomeEditorialNav locale="en" />);
    const nav = container.querySelector('nav')!;
    expect(nav).toBeTruthy();
    expect(nav.getAttribute('aria-label')).toBeTruthy();

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/en/how-to-play',
      '/en/guides',
      '/en/blog',
      '/en/faq',
      '/en/about',
    ]);
  });

  it('prefixes every link with the active locale', () => {
    const { container } = render(<HomeEditorialNav locale="he" />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs.every((h) => h!.startsWith('/he/'))).toBe(true);
  });

  it('falls back to English labels for an unknown locale (never blank)', () => {
    const { container } = render(<HomeEditorialNav locale="zz" />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(5);
    links.forEach((a) => expect(a.textContent?.trim().length).toBeGreaterThan(0));
    // unknown locale still routes under its own prefix (hreflang-safe)
    expect(links[0].getAttribute('href')).toBe('/zz/how-to-play');
  });

  it('has non-empty labels for all 5 supported locales (no missing translations)', () => {
    for (const locale of HOME_EDITORIAL_LOCALES) {
      const { container } = render(<HomeEditorialNav locale={locale} />);
      const labels = Array.from(container.querySelectorAll('a')).map((a) => a.textContent?.trim());
      expect(labels.length).toBe(5);
      labels.forEach((l) => expect(l && l.length).toBeTruthy());
    }
  });
});
