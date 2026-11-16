/**
 * Cookie consent sheet vs the native AdMob banner on /daily.
 *
 * The daily hub allows the anchored banner. The sheet is `fixed bottom-0` and
 * `aria-modal="false"`, so the SurfaceView banner composites over it. Measured
 * on the reported 411×891 phone: the sheet is 144px tall and a 90px banner
 * covers 90px of it — the player sees a sliver of the popup behind the ad and
 * cannot use the choice row. Lift the sheet above `--bottom-stack-height`
 * (nav + banner) whenever that chrome is on screen. Do not suppress the banner:
 * the sheet stays until a choice, and hiding the ad for that whole window
 * would zero first-session banner revenue.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
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
vi.mock('next/navigation', () => ({
  usePathname: () => '/he/daily',
}));

vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — clears the native ad on the daily hub', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function sheet() {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(1500); });
    return screen.getByRole('dialog');
  }

  it('lifts above the ad stack while the native banner is up, and not merely because the nav class is on', () => {
    const cls = sheet().className;
    expect(cls).toMatch(/has-admob-banner_&\]:bottom-\[var\(--bottom-stack-height/);
    expect(cls).not.toMatch(/has-global-bottom-nav_&\]:bottom-/);
  });
});
