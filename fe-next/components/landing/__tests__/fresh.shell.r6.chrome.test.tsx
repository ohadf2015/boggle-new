/**
 * Piece A (shell), round 6: the two tail items the critic named that live
 * outside the page sections (SPEC §12, lead 06:50).
 *
 * 1. The cyan "Play Boggle Online Free" box: page.tsx rendered three
 *    `*CrossLink anchorVariant="home"` <aside> banners between LandingView
 *    and the FAQ. Their hrefs are carried inline by the How to Play line
 *    (FreshCrossLink, verified in the /en /es /sv server HTML), so the
 *    banners go.
 * 2. The footer's "For Teachers" column: 17 education links, ~1,860px of
 *    link lines on a phone. Below md they fold behind ONE native <details>
 *    ("All teacher pages"); Education Hub stays visible; every link stays in
 *    the server HTML; the desktop footer is unchanged.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@/app/[locale]/(home)/HomeClient', () => ({ __esModule: true, default: () => <div data-testid="home-client" /> }));
vi.mock('@/lib/landing/fetchLandingData', () => ({ fetchLandingData: vi.fn(async () => undefined) }));
vi.mock('@/components/seo/HomepageContentSection', () => ({
  HomepageContentSection: () => <section data-testid="home-content" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => (typeof f === 'string' ? f : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/components/CookieConsent', () => ({ ManageCookiesButton: () => <button>Manage Cookies</button> }));
vi.mock('@/components/EmailSignupForm', () => ({ default: () => <form /> }));

import HomePage from '@/app/[locale]/(home)/page';
import Footer from '@/components/Footer';
import { EDUCATION_PAGES } from '@/lib/seo/educationPageLinks';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

async function serverHtml(locale: string): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }) }));
}

describe('homepage: no cross-link banner boxes', () => {
  it.each([
    ['en', '/en/play-boggle-online-free'],
    ['es', '/es/juego-de-palabras-multijugador'],
    ['sv', '/sv/swedish-multiplayer-word-game'],
  ])('%s renders no <aside> banner to %s', async (locale, href) => {
    const html = await serverHtml(locale);
    expect(html).not.toContain('<aside');
    expect(html).not.toContain(href);
  });

  it('page.tsx neither imports nor renders the *CrossLink banners', () => {
    const src = read('app/[locale]/(home)/page.tsx');
    expect(src).not.toMatch(/CrossLink/);
  });

  it('keeps the one FAQPage JSON-LD and the visible content section', async () => {
    const html = await serverHtml('en');
    expect(html.match(/"@type":"FAQPage"/g)?.length ?? 0).toBe(1);
    expect(html).toContain('data-testid="home-content"');
  });
});

describe('footer: For Teachers shows four pages and folds the rest', () => {
  const teachers = () => screen.getByRole('navigation', { name: 'For Teachers' });

  it('keeps Education Hub and the four evergreen pages above the fold', () => {
    render(<Footer />);
    const fold = teachers().querySelector('details') as HTMLElement;
    const hub = within(teachers()).getByRole('link', { name: 'Education Hub' });
    expect(hub.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const page of EDUCATION_PAGES.slice(0, 4)) {
      const link = teachers().querySelector(`a[href="/en/education/${page.slug}"]`) as HTMLElement;
      expect(link.closest('details')).toBeNull();
      expect(link.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('is ONE native disclosure, closed at rest, labelled "All teacher pages", at every width', () => {
    render(<Footer />);
    const folds = teachers().querySelectorAll('details');
    expect(folds).toHaveLength(1);
    const fold = folds[0] as HTMLElement;
    expect(fold.hasAttribute('open')).toBe(false);
    expect(fold.className).toMatch(/(^|\s)peer(\s|$)/);
    expect(fold.className).not.toMatch(/\bmd:hidden\b/);
    expect(fold.querySelector('summary')?.textContent).toContain('All teacher pages');
    expect(read('components/Footer.tsx')).toContain("t('homeFresh.close.teacherPages', 'All teacher pages')");
  });

  it('keeps every other teacher page in the HTML, shown when the fold opens', () => {
    render(<Footer />);
    const fold = teachers().querySelector('details') as HTMLElement;
    const list = fold.nextElementSibling as HTMLElement;
    expect(list.tagName).toBe('UL');
    expect(list.className.split(/\s+/)).toEqual(expect.arrayContaining(['hidden', 'peer-open:grid']));
    const hrefs = [...list.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(EDUCATION_PAGES.slice(4).map((p) => `/en/education/${p.slug}`));
  });
});
