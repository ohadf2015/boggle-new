/**
 * CookieConsent — CrazyGames iframe gating.
 *
 * CG portal users must NOT see our cookie banner: CrazyGames serves its own
 * platform-level consent UI before the iframe loads. Showing a second banner
 * inside the iframe violates the embed UX expectation and clutters the
 * first frame on the production CG entry path (MP lobby).
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

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform }),
}));

describe('CookieConsent — CrazyGames gating', () => {
  beforeEach(() => {
    mockIsOnCrazyGamesPlatform = false;
  });

  it('renders the consent dialog on the standard web flow', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders nothing when running inside the CrazyGames iframe', () => {
    mockIsOnCrazyGamesPlatform = true;
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
