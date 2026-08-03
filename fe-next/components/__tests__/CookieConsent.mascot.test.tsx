/**
 * CookieConsent — mascot illustration.
 *
 * The banner shows the brand mascot happily eating a cookie, reinforcing
 * personality and making the (legally mandatory) consent prompt charming
 * instead of corporate. The image is decorative + brand-flavored.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => {},
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

// The consent modal defers its initial mount to an idle slice (post-LCP perf
// fix). These tests assert behavior, not timing — run the idle callback
// synchronously.
vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — mascot illustration', () => {
  it('renders the cookie-eating mascot image', () => {
    render(<CookieConsent />);
    const img = screen.getByAltText('cookieConsent.mascotAlt') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('cookie-consent-mascot');
  });
});
