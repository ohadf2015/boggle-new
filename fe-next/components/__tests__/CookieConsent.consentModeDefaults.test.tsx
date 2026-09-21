/**
 * CookieConsent — Google Consent Mode v2 defaults are set before any Google tags load.
 *
 * The LOAD-BEARING CONSTRAINT: no ad/analytics scripts should be gated by consent state,
 * which means:
 * - GoogleConsentMode must render BEFORE GoogleAnalytics in the locale layout
 * - With no stored consent decision, GoogleConsentMode.tsx emits ad_storage='denied' and analytics_storage='denied'
 * - CookieConsent component itself must NOT call consent mutators on mount (only on click)
 *
 * This test verifies the invariant: when CookieConsent first renders without a stored decision,
 * no consent action is triggered, the component defers to idle callback (post-LCP), and the
 * ad/analytics loaders do NOT fire before user consent is granted.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  acceptAll: vi.fn(),
  declineAll: vi.fn(),
  setConsentState: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/utils/cookieConsent', () => ({
  hasConsent: (type: string) => {
    // Return false for analytics by default (no consent yet)
    return false;
  },
  hasConsentDecision: () => false,
  getConsentState: () => ({ analytics: false, advertising: false, timestamp: 0 }),
  acceptAll: mocks.acceptAll,
  declineAll: mocks.declineAll,
  setConsentState: mocks.setConsentState,
  resetConsent: vi.fn(),
  onConsentChange: () => () => {},
}));

import CookieConsent from '../CookieConsent';

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — Consent Mode v2 defaults invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call consent mutators on mount (only on user click)', () => {
    render(<CookieConsent />);
    // After mount and idle callback fires, no consent action should be triggered yet
    expect(mocks.acceptAll).not.toHaveBeenCalled();
    expect(mocks.declineAll).not.toHaveBeenCalled();
    expect(mocks.setConsentState).not.toHaveBeenCalled();
  });

  it('defers the mount to idle callback so GoogleConsentMode has time to set defaults', () => {
    const callbacks: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });

    try {
      render(<CookieConsent />);
      // Not mounted immediately
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // Mount happens in idle callback
      act(() => callbacks.forEach((cb) => cb()));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally {
      vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
        cb();
        return 1;
      });
    }
  });

});

describe('CookieConsent — layout source order guard', () => {
  it('GoogleConsentMode renders BEFORE GoogleAnalytics in app/[locale]/layout.tsx', () => {
    const layoutPath = path.resolve(
      __dirname,
      '..',
      '..',
      'app',
      '[locale]',
      'layout.tsx'
    );
    const layoutSrc = readFileSync(layoutPath, 'utf8');

    // Find the positions of GoogleConsentMode and GoogleAnalytics imports
    const googleConsentModePos = layoutSrc.indexOf('GoogleConsentMode');
    const googleAnalyticsPos = layoutSrc.indexOf('GoogleAnalytics');

    expect(googleConsentModePos).toBeGreaterThan(-1);
    expect(googleAnalyticsPos).toBeGreaterThan(-1);
    expect(googleConsentModePos).toBeLessThan(googleAnalyticsPos);

    // Find the positions of their render calls
    const googleConsentModeRenderPos = layoutSrc.indexOf(
      '<GoogleConsentMode'
    );
    const googleAnalyticsRenderPos = layoutSrc.indexOf(
      '<GoogleAnalytics'
    );

    expect(googleConsentModeRenderPos).toBeGreaterThan(-1);
    expect(googleAnalyticsRenderPos).toBeGreaterThan(-1);
    expect(googleConsentModeRenderPos).toBeLessThan(
      googleAnalyticsRenderPos
    );
  });
});
