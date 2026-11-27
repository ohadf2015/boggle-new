/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '../Footer';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    dir: 'ltr',
  }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/components/CookieConsent', () => ({
  ManageCookiesButton: () => <button>Manage Cookies</button>,
}));
vi.mock('../EmailSignupForm', () => ({ default: () => <form aria-label="newsletter" /> }));
vi.mock('@/components/holidays/eggs/PermanentEgg', () => ({ default: () => null }));
vi.mock('@/components/holidays/landing/HolidaySeasonLink', () => ({ default: () => null }));

const hrefs = () => screen.getAllByRole('link').map((a) => a.getAttribute('href'));

describe('Footer layout', () => {
  it('links every internal page once', () => {
    render(<Footer />);
    const internal = hrefs().filter((h) => h?.startsWith('/'));
    expect(internal.filter((h, i) => internal.indexOf(h) !== i)).toEqual([]);
  });

  it('drops hub links whose children are already listed', () => {
    render(<Footer />);
    expect(hrefs()).not.toContain('/en/legal');
    expect(hrefs()).not.toContain('/en/tools');
  });

  it('groups links under Game Modes, Resources, For Teachers and Connect', () => {
    render(<Footer />);
    const modes = within(screen.getByRole('navigation', { name: 'Game Modes' }));
    expect(modes.getByRole('link', { name: 'Word Bridge' })).toHaveAttribute('href', '/en/connections');
    expect(modes.getByRole('link', { name: 'Android App' })).toBeInTheDocument();
    const resources = within(screen.getByRole('navigation', { name: 'Resources' }));
    expect(resources.getByRole('link', { name: 'How to Play' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'For Teachers' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Explore' })).toBeNull();
  });

  it('puts legal pages and the sitemap in the bottom bar', () => {
    render(<Footer />);
    const legal = within(screen.getByRole('navigation', { name: 'legal.title' }));
    for (const path of ['/en/legal/privacy', '/en/legal/terms', '/en/legal/refund', '/en/sitemap']) {
      expect(legal.getAllByRole('link').map((a) => a.getAttribute('href'))).toContain(path);
    }
    expect(legal.getByRole('button', { name: 'Manage Cookies' })).toBeInTheDocument();
  });

  it('shows the LexiClash wordmark linking home', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'LexiClash' })).toHaveAttribute('href', '/en');
  });
});
