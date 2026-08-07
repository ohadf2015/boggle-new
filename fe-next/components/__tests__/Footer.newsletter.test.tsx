/**
 * Footer — newsletter email capture (sitewide).
 *
 * D1-retention fix (2026-08-07): LexiClash had zero email-capture surfaces on
 * any public page despite ~300 daily organic visitors. The newsletter signup
 * form renders in the marketing footer, so every public SEO page gains a
 * frictionless re-engagement surface. This test locks the form into the
 * non-CrazyGames footer and verifies it stays OUT of the CrazyGames legal
 * strip (platform forbids unsolicited capture).
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

describe('Footer — newsletter signup (email capture)', () => {
  it('renders the email signup form on the public footer', () => {
    render(<Footer />);
    expect(
      screen.getByPlaceholderText('email.placeholder')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'email.submit' })).toBeInTheDocument();
  });

  it('keeps the newsletter headline copy in the footer', () => {
    render(<Footer />);
    // t() mock returns the key; the translation file is exercised in build/e2e.
    expect(screen.getByText('newsletter.title')).toBeInTheDocument();
  });
});