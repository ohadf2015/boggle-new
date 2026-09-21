/**
 * CookieConsent — policy link must always be visible on mobile (390px).
 *
 * Regression: line-clamp-1 on the banner message clips the trailing "learn more"
 * link on mobile, making an informed consent choice impossible (user can't access
 * the policy without dismissing the banner).
 *
 * The policy link must NOT be a descendant of any line-clamp-* class, ensuring
 * it is always visible at 390px width.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

const mocks = {
  hasConsentDecision: false,
  isOnCrazyGamesPlatform: false,
};

vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => mocks.hasConsentDecision,
  getConsentState: () => ({ analytics: false, advertising: false, timestamp: 0 }),
  acceptAll: vi.fn(),
  declineAll: vi.fn(),
  setConsentState: vi.fn(),
  resetConsent: vi.fn(),
  onConsentChange: () => () => {},
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'cookieConsent.title': 'Care for a cookie?',
        'cookieConsent.message': 'We use cookies for analytics',
        'cookieConsent.learnMore': 'Learn more',
        'cookieConsent.accept': 'Accept All',
        'cookieConsent.decline': 'Decline',
        'cookieConsent.customize': 'Customize',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/lib/inGameSurface', () => ({
  useInGameSurface: () => false,
}));

vi.mock('@/lib/overlayQuietZone', () => ({
  useOverlayQuietZone: () => false,
}));

vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

import CookieConsent from '../CookieConsent';

describe('CookieConsent — policy link visibility', () => {
  beforeEach(() => {
    mocks.hasConsentDecision = false;
    vi.clearAllMocks();
  });

  it('policy link is NOT a descendant of any line-clamp-* element', () => {
    render(<CookieConsent />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Find the policy link
    const policyLink = screen.getByText('Learn more');
    expect(policyLink).toBeInTheDocument();

    // Walk up from the link to the dialog, checking each ancestor
    let current: Element | null = policyLink;
    while (current && current !== dialog) {
      const classList = Array.from(current.classList);
      const hasLineclamp = classList.some((cls) => cls.startsWith('line-clamp-'));
      expect(hasLineclamp, `Ancestor ${current.tagName}.${classList.join('.')} has line-clamp`).toBe(
        false
      );
      current = current.parentElement;
    }
  });
});
