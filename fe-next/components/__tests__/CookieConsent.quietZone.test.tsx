/**
 * CookieConsent — must stand down inside the overlay quiet zone.
 *
 * Measured on a guest's phone (QA sweep 2026-09-11, 17:16): the "Care for a
 * cookie?" sheet rendered DURING a live round and sat over the board and the
 * score bar while the timer ran from 1:24 to 0:48 — 36 seconds of a child's
 * round time, tiles present in the DOM but unreachable. It already re-ranks
 * itself to z-[60] on a game surface, which is not the same thing as not being
 * there: on a phone the sheet is up to 60vh of the viewport.
 *
 * Consent is deferred, never skipped — non-essential scripts stay gated on a
 * decision nobody has made, and the sheet returns the moment the zone clears.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

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

describe('CookieConsent — overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetOverlayQuietZoneForTests();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.useRealTimers();
  });

  /**
   * `vi.useFakeTimers()` also fakes requestIdleCallback, which is what defers the
   * sheet's own mount. Run that out FIRST or the case passes because the sheet
   * had not been asked to appear yet — an absent prompt is not a gated prompt.
   */
  function renderAfterIdle() {
    const view = render(<CookieConsent />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    return view;
  }

  it('is asked to appear on an ordinary page (control for the two cases below)', () => {
    renderAfterIdle();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render over a live board or a round-end recap', () => {
    const release = claimOverlayQuietZone('classroom-results');
    renderAfterIdle();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    release();
  });

  it('returns once the zone clears — the ask is deferred, not skipped', () => {
    const release = claimOverlayQuietZone('classroom-results');
    renderAfterIdle();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('reserves no bottom-sheet height while it is stood down', () => {
    const release = claimOverlayQuietZone('classroom-results');
    renderAfterIdle();
    expect(document.documentElement.classList.contains('has-cookie-consent')).toBe(false);
    release();
  });
});
