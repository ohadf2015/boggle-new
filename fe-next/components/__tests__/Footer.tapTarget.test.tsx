/**
 * Footer tap-target audit test.
 *
 * Audit 2026-05-02 (M1): every page footer rendered links at 19px tall —
 * fails WCAG 2.5.8 Target Size Minimum (AA, 24×24 css px). The fix adds
 * vertical padding to the shared link class so 14px text + py-2 = 30px
 * tappable, comfortably above the 24px floor without restructuring layout.
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

describe('Footer — tap-target audit (WCAG 2.5.8 AA)', () => {
  it('every navigation link has padding sufficient for 24×24 tap target', () => {
    render(<Footer />);

    // All footer Links — both .footer.* and .legal.* sets share the same
    // padding contract. Check that every <a> with the shared link class
    // pattern includes vertical padding (py-2 or larger).
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(5); // sanity — footer renders many links

    const navLinks = links.filter((a) => {
      const cls = a.className;
      // Pick out the footer/legal link styles (text-sm + neo-white hover-color)
      return /text-sm/.test(cls) && /text-neo-white/.test(cls);
    });

    expect(navLinks.length).toBeGreaterThan(5);

    for (const link of navLinks) {
      // Tailwind py-2 = 8px each side. Combined with text-sm (~19px line height),
      // total tappable height ≈ 35px — clears WCAG 2.5.8 AA (24×24).
      expect(link.className).toMatch(/\bpy-2\b|\bpy-2\.5\b|\bpy-3\b|\bmin-h-\[(2[4-9]|[3-9]\d)px\]/);
    }
  });
});
