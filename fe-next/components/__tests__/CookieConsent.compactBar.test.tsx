/**
 * CookieConsent — compact bottom bar (UX audit 2026-09-14).
 *
 * Prod (lexiclash.live) measured a ~350px sheet covering PLAY NOW and the lower
 * grid, with ACCEPT ALL as the loudest lime CTA. The bar must stay short, keep
 * Accept off neo-lime, and remain non-blocking.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => false,
  getConsentState: () => ({ analytics: false, advertising: false, timestamp: 0 }),
  acceptAll: vi.fn(),
  declineAll: vi.fn(),
  setConsentState: vi.fn(),
  resetConsent: vi.fn(),
  onConsentChange: () => () => {},
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — compact bottom bar', () => {
  it('marks itself as the compact-bar variant', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-cookie-consent', 'compact-bar');
  });

  it('keeps a small mascot (not the fold-owning 80px centered art)', () => {
    render(<CookieConsent />);
    const img = screen.getByAltText('cookieConsent.mascotAlt');
    expect(img).toHaveClass('h-10');
    expect(img).toHaveClass('w-10');
    expect(img.className).not.toMatch(/h-20|w-20/);
  });

  it('exposes Accept / Customize / Decline without a full-width lime Accept slab', () => {
    render(<CookieConsent />);
    const accept = screen.getByRole('button', { name: 'cookieConsent.accept' });
    const customize = screen.getByRole('button', { name: 'cookieConsent.customize' });
    const decline = screen.getByRole('button', { name: 'cookieConsent.decline' });
    expect(accept).toBeInTheDocument();
    expect(customize).toBeInTheDocument();
    expect(decline).toBeInTheDocument();
    expect(accept.className).toMatch(/bg-neo-cyan/);
    expect(accept.className).not.toMatch(/\bw-full\b/);
  });
});
