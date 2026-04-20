import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { type ReactNode } from 'react';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    prepareRewardVideoAd: vi.fn(() => Promise.resolve()),
    showRewardVideoAd: vi.fn(() => Promise.resolve()),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
    showInterstitial: vi.fn(() => Promise.resolve()),
    showBanner: vi.fn(() => Promise.resolve()),
    hideBanner: vi.fn(() => Promise.resolve()),
  },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { AdMobProvider } from '@/contexts/AdMobContext';
import { NativeBannerAd } from '../NativeBannerAd';

function renderWithProvider(isNative: boolean, platform: string = 'android') {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(isNative);
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
  function Wrapper({ children }: { children: ReactNode }) {
    return <AdMobProvider>{children}</AdMobProvider>;
  }
  return render(<NativeBannerAd />, { wrapper: Wrapper });
}

describe('NativeBannerAd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders spacer div on native', () => {
    const { container } = renderWithProvider(true);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).not.toBeNull();
    expect(spacer.tagName).toBe('DIV');
    expect(spacer.style.height).toBe('60px');
  });

  it('returns null on web', () => {
    const { container } = renderWithProvider(false, 'web');
    expect(container.firstChild).toBeNull();
  });

  it('calls showBanner on mount', async () => {
    renderWithProvider(true);
    // Allow microtasks to flush
    await vi.waitFor(() => {
      expect(AdMob.showBanner).toHaveBeenCalled();
    });
  });

  it('calls hideBanner on unmount', async () => {
    const { unmount } = renderWithProvider(true);
    await vi.waitFor(() => {
      expect(AdMob.showBanner).toHaveBeenCalled();
    });
    unmount();
    await vi.waitFor(() => {
      expect(AdMob.hideBanner).toHaveBeenCalled();
    });
  });
});
