/**
 * Footer "Android app" link (web→install funnel + crawl equity).
 *
 * ASO fix (2026-07-04): /download-word-game-android was reachable only via the
 * sitemap — no sitewide internal link. A footer link flows crawl equity into
 * the install landing from every page and gives non-Android visitors a stable
 * path to the Play Store funnel (the AndroidAppInstallPromo popup only fires
 * on Android browsers).
 *
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '../Footer';

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

describe('Footer — Android app landing link', () => {
  it('links the install landing page sitewide', () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/en/download-word-game-android');
  });

  it('android link carries the WCAG tap-target padding contract', () => {
    render(<Footer />);
    const link = screen
      .getAllByRole('link')
      .find((a) => (a.getAttribute('href') || '').includes('download-word-game-android'));
    expect(link).toBeDefined();
    expect(link!.className).toMatch(/\bpy-2\b/);
  });
});
