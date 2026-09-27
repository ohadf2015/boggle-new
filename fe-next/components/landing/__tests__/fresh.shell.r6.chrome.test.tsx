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

vi.mock('@/app/[locale]/PageClient', () => ({ __esModule: true, default: () => <div data-testid="home-client" /> }));
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

describe('footer: For Teachers folds on phones only', () => {
  const teachers = () => screen.getByRole('navigation', { name: 'For Teachers' });

  it('keeps Education Hub visible above the fold', () => {
    render(<Footer />);
    const hub = within(teachers()).getByRole('link', { name: 'Education Hub' });
    const fold = teachers().querySelector('details') as HTMLElement;
    expect(fold).not.toBeNull();
    expect(hub.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hub.closest('details')).toBeNull();
  });

  it('is ONE native disclosure, closed at rest, labelled "All teacher pages", gone at md', () => {
    render(<Footer />);
    const folds = teachers().querySelectorAll('details');
    expect(folds).toHaveLength(1);
    const fold = folds[0] as HTMLElement;
    expect(fold.hasAttribute('open')).toBe(false);
    expect(fold.className).toMatch(/(^|\s)peer(\s|$)/);
    expect(fold.className).toMatch(/\bmd:hidden\b/);
    // The mock t() returns the fallback: like every other footer label, the
    // summary carries an English fallback for a catalogue without the key.
    expect(fold.querySelector('summary')?.textContent).toContain('All teacher pages');
    expect(read('components/Footer.tsx')).toContain("t('homeFresh.close.teacherPages', 'All teacher pages')");
  });

  it('keeps every teacher page in the HTML, shown when the fold opens and always at md', () => {
    render(<Footer />);
    const fold = teachers().querySelector('details') as HTMLElement;
    const list = fold.nextElementSibling as HTMLElement;
    expect(list.tagName).toBe('UL');
    for (const cls of ['hidden', 'peer-open:grid', 'md:grid']) {
      expect(list.className.split(/\s+/)).toContain(cls);
    }
    const hrefs = [...list.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(EDUCATION_PAGES.map((p) => `/en/education/${p.slug}`));
  });
});
