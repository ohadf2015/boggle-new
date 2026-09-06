/**
 * Footer "For Teachers" link cluster.
 *
 * Discoverability fix (2026-05-30): the /education SEO landing pages were
 * crawl-orphaned — linked only from the rarely-crawled hub, never from the
 * sitewide footer. GSC URL Inspection showed /en/education/games-for-teachers
 * as "URL is unknown to Google". Sitewide footer links push crawl equity from
 * every page (incl. the ranking scrabble pages) into the teacher landings.
 *
 * @vitest-environment jsdom
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '../Footer';
import { EDUCATION_PAGES, educationPageLabel } from '@/lib/seo/educationPageLinks';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, fallback?: string) =>
      typeof fallback === 'string' ? fallback : key,
    dir: 'ltr',
  }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/components/CookieConsent', () => ({
  ManageCookiesButton: () => <button>Manage Cookies</button>,
}));

describe('Footer — For Teachers education links (crawl-equity)', () => {
  const hrefs = () =>
    screen.getAllByRole('link').map((a) => a.getAttribute('href'));

  it('links the education hub sitewide', () => {
    render(<Footer />);
    expect(hrefs()).toContain('/en/education');
  });

  it('links the previously-orphaned teacher landing pages', () => {
    render(<Footer />);
    const h = hrefs();
    expect(h).toContain('/en/education/games-for-teachers');
    expect(h).toContain('/en/education/vocabulary-games-classroom');
    expect(h).toContain('/en/education/esl-word-games');
  });

  /**
   * The 2026-05-30 fix named five pages by hand. Seven more landing pages shipped
   * after it — including the six teacher-moment pages, which have the deepest
   * content in the module — and none of them was ever added, so each repeated the
   * exact "unknown to Google" problem this cluster was built to solve. The footer
   * now renders the whole registry, and this asserts the set, not a sample.
   */
  it('links EVERY registered education landing page, not a hand-picked five', () => {
    render(<Footer />);
    const h = hrefs();
    const missing = EDUCATION_PAGES.map((p) => `/en/education/${p.slug}`).filter(
      (href) => !h.includes(href),
    );
    expect(missing).toEqual([]);
  });

  it('uses the localized label for the active language', () => {
    render(<Footer />);
    // `en` here because the LanguageContext mock pins it; the point is that the
    // anchor text comes from the registry rather than an English literal.
    expect(screen.getByText(educationPageLabel('brain-breaks-word-games', 'en'))).toBeTruthy();
  });

  it('education links carry the WCAG tap-target padding contract', () => {
    render(<Footer />);
    const eduLinks = screen
      .getAllByRole('link')
      .filter((a) => (a.getAttribute('href') || '').includes('/education'));
    expect(eduLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of eduLinks) {
      expect(link.className).toMatch(/\bpy-2\b|\bpy-2\.5\b|\bpy-3\b/);
    }
  });

  // Perf: footer links are secondary (legal/blog/SEO) and rarely clicked. The App
  // Router eagerly prefetches each <Link>'s RSC payload on viewport-entry — on the
  // many short pages the footer is in-viewport at load, firing ~19 background RSC
  // fetches/renders for nothing. prefetch={false} keeps hover-prefetch (snappy on
  // intent) and the <a href> still renders (crawl equity intact, asserted above).
  it('every footer <Link> opts out of eager prefetch (prefetch={false})', () => {
    const src = fs.readFileSync(path.join(__dirname, '../Footer.tsx'), 'utf8');
    const links = src.match(/<Link\b[^>]*>/g) || [];
    expect(links.length).toBeGreaterThan(0);
    for (const tag of links) {
      expect(tag).toMatch(/prefetch=\{false\}/);
    }
  });
});
