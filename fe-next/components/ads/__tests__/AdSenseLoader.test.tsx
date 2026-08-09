import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const trackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => null }));
vi.mock('@/hooks/useSocialCapabilities', () => ({ useSocialCapabilities: () => ({ tier: 'adult' }) }));
vi.mock('@/hooks/useOnboardingActive', () => ({ useOnboardingActive: () => false }));
vi.mock('@/utils/cookieConsent', () => ({
  hasConsent: () => true,
  onConsentChange: () => () => {},
}));

import AdSenseLoader from '../AdSenseLoader';

/**
 * The failure this guards: from 2026-06-08 the web ad layer injected adsbygoogle.js
 * and Auto-Ads placed ZERO units — the only <ins> on the page was Google's hidden
 * `adsbygoogle-noablate` stub. The script "worked", so nothing anywhere reported that
 * the web surface (~5x the native session volume) was monetizing at zero.
 */
describe('AdSenseLoader — no-fill audit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    trackGrowthEvent.mockClear();
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = 'true';
    document.getElementById('adsbygoogle-init')?.remove();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_ADSENSE_ENABLED;
    document.getElementById('adsbygoogle-init')?.remove();
    document.querySelectorAll('ins.adsbygoogle').forEach((el) => el.remove());
  });

  it('reports zero placements when Auto-Ads renders only the hidden anchor stub', () => {
    render(<AdSenseLoader />);
    const stub = document.createElement('ins');
    stub.className = 'adsbygoogle adsbygoogle-noablate';
    document.body.appendChild(stub);

    vi.advanceTimersByTime(15000);

    expect(trackGrowthEvent).toHaveBeenCalledWith('web_ads_fill_audit', {
      units: 0,
      filled: 0,
      unfilled: 0,
      client: 'ca-pub-1896836706464880',
      path: window.location.pathname,
    });
  });

  it('reports the filled count when Auto-Ads actually places ads', () => {
    render(<AdSenseLoader />);
    const filled = document.createElement('ins');
    filled.className = 'adsbygoogle';
    filled.setAttribute('data-ad-status', 'filled');
    document.body.appendChild(filled);

    vi.advanceTimersByTime(15000);

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'web_ads_fill_audit',
      expect.objectContaining({ units: 1, filled: 1, unfilled: 0 }),
    );
  });

  it('does not audit when the script was never injected (integration dark)', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_ENABLED;
    render(<AdSenseLoader />);

    vi.advanceTimersByTime(15000);

    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('cancels the pending audit on unmount', () => {
    const { unmount } = render(<AdSenseLoader />);
    unmount();

    vi.advanceTimersByTime(15000);

    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});
