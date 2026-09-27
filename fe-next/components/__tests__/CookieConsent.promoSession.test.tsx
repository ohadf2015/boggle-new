import { vi } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import CookieConsent from '../CookieConsent';
import { clearPromoSessionFlag, wasPromoShownThisSession } from '@/lib/landing/promoOverlaySession';

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

/**
 * One promotional overlay per session: when the consent sheet appears it
 * claims the session, so the Android install promo (which checks
 * wasPromoShownThisSession at fire time) never stacks on top of it.
 */
describe('CookieConsent — claims the one-overlay-per-session slot', () => {
  beforeEach(() => clearPromoSessionFlag());

  it('given no consent decision, when the sheet shows, then the promo session flag is set', async () => {
    expect(wasPromoShownThisSession()).toBe(false);
    render(<CookieConsent />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(wasPromoShownThisSession()).toBe(true);
  });
});
