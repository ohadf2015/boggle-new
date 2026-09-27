/**
 * CookieConsent — all three action buttons have equal visual weight.
 *
 * Regression: Customize button was border-2/text-xs while Accept/Decline were
 * border-3/text-sm, making Customize appear weaker and discouraging users from
 * exercising their lawful right to customize consent choices.
 *
 * All three buttons (Accept All, Customize, Decline All) must have identical
 * border-width and text-size classes.
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

describe('CookieConsent — button parity', () => {
  beforeEach(() => {
    mocks.hasConsentDecision = false;
    vi.clearAllMocks();
  });

  it('all three action buttons have border-3 and text-sm', () => {
    render(<CookieConsent />);

    const acceptBtn = screen.getByText('Accept All');
    const declineBtn = screen.getByText('Decline');
    const customizeBtn = screen.getByText('Customize');

    expect(acceptBtn).toBeInTheDocument();
    expect(declineBtn).toBeInTheDocument();
    expect(customizeBtn).toBeInTheDocument();

    // Extract classes and check for text-size and border-width
    const getBorderAndTextClasses = (btn: HTMLElement) => {
      const classes = Array.from(btn.classList);
      const borderClass = classes.find((cls) => cls.match(/^border-\d+$/));
      const textClass = classes.find((cls) => cls.match(/^text-(xs|sm|base|lg)$/));
      return { borderClass, textClass };
    };

    const acceptClasses = getBorderAndTextClasses(acceptBtn);
    const declineClasses = getBorderAndTextClasses(declineBtn);
    const customizeClasses = getBorderAndTextClasses(customizeBtn);

    // All should have border-3
    expect(acceptClasses.borderClass).toBe('border-3');
    expect(declineClasses.borderClass).toBe('border-3');
    expect(customizeClasses.borderClass).toBe('border-3');

    // All should have text-sm
    expect(acceptClasses.textClass).toBe('text-sm');
    expect(declineClasses.textClass).toBe('text-sm');
    expect(customizeClasses.textClass).toBe('text-sm');
  });
});
