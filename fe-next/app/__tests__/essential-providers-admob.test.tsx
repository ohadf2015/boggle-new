import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
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

import { AdMobProvider } from '@/contexts/AdMobContext';
import { useAdMob } from '@/hooks/useAdMob';

function Wrapper({ children }: { children: ReactNode }) {
  return <AdMobProvider>{children}</AdMobProvider>;
}

describe('AdMobProvider integration (wired into EssentialProviders)', () => {
  it('useAdMob resolves without throwing when AdMobProvider is in tree', () => {
    const { result } = renderHook(() => useAdMob(), { wrapper: Wrapper });
    expect(typeof result.current.showRewarded).toBe('function');
    expect(typeof result.current.showInterstitial).toBe('function');
    expect(typeof result.current.showBanner).toBe('function');
    expect(typeof result.current.hideBanner).toBe('function');
  });

  it('useAdMob throws when AdMobProvider is missing from tree', () => {
    expect(() => renderHook(() => useAdMob())).toThrow(
      'useAdMobContext must be used within AdMobProvider'
    );
  });
});
