/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '../Footer';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    dir: 'ltr',
  }),
}));

let onCrazyGames = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: onCrazyGames }),
}));

vi.mock('@/components/CookieConsent', () => ({
  ManageCookiesButton: () => <button>Manage Cookies</button>,
}));

describe('Footer — Oddities badge', () => {
  it('links the Oddities listing with a sized badge image', () => {
    onCrazyGames = false;
    render(<Footer />);
    const img = screen.getByAltText('LexiClash on Oddities');
    expect(img).toHaveAttribute('src', 'https://oddities.app/badge/lexiclash');
    expect(img).toHaveAttribute('width', '204');
    expect(img).toHaveAttribute('height', '20');
    const link = img.closest('a');
    expect(link).toHaveAttribute('href', 'https://oddities.app/app/lexiclash?ref=badge');
    expect(link).not.toHaveAttribute('rel');
  });

  it('is absent from the minimal CrazyGames strip', () => {
    onCrazyGames = true;
    render(<Footer />);
    expect(screen.queryByAltText('LexiClash on Oddities')).toBeNull();
  });
});
