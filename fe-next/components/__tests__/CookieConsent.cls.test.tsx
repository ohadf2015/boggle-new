/**
 * CookieConsent — CLS (layout-shift) guard.
 *
 * Field data showed the page footer shifting ~140px at dom-content-loaded on
 * every route: the banner used to set `document.body.style.paddingBottom`
 * inside a post-hydration effect (0 → 140px), shoving the in-flow footer down.
 *
 * The fix reserves that space via the `needs-cookie-consent` <html> class,
 * primed in <head> BEFORE paint. So:
 *  - mounting the banner must NOT mutate body.style.paddingBottom, and
 *  - dismissing it must DROP the class (user-initiated → excluded from CLS).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }));
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

describe('CookieConsent — CLS guard', () => {
  beforeEach(() => {
    document.body.style.paddingBottom = '';
    document.documentElement.classList.remove('needs-cookie-consent');
  });

  it('does NOT push the footer by mutating body paddingBottom on mount', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The old CLS bug: this was set to '140px' in a post-paint effect.
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('drops the needs-cookie-consent reservation when dismissed', () => {
    // Simulate the head-script prime that reserves space before paint.
    document.documentElement.classList.add('needs-cookie-consent');
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookieConsent.accept'));
    expect(
      document.documentElement.classList.contains('needs-cookie-consent'),
    ).toBe(false);
  });
});
