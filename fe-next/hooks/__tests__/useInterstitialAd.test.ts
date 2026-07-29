/**
 * useInterstitialAd — platform routing + dedupe contract.
 *
 * Routing (exactly one platform fires per call):
 *   CG iframe → CG midgame ad
 *   Native (Capacitor) → AdMob interstitial
 *   Production web → H5 Games Ads adBreak
 *
 * Same placement name dedupes within the hook instance; distinct names refire.
 */
import { renderHook, act } from '@testing-library/react';

const { midgame, admobShow, h5Show, cgFlag, nativeFlag } = vi.hoisted(() => ({
  midgame: vi.fn(),
  admobShow: vi.fn(),
  h5Show: vi.fn(),
  cgFlag: { value: false },
  nativeFlag: { value: false },
}));

vi.mock('@/hooks/useCrazyGamesAds', () => ({
  useCrazyGamesAds: () => ({ requestMidgameAd: midgame }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: cgFlag.value }),
}));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showInterstitial: admobShow }),
}));
vi.mock('@/hooks/useH5GamesAds', () => ({
  useH5GamesAds: () => ({ isAvailable: true, showInterstitial: h5Show, showRewarded: vi.fn(), initialize: vi.fn() }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativeFlag.value, getPlatform: () => (nativeFlag.value ? 'android' : 'web') },
}));

import { useInterstitialAd } from '../useInterstitialAd';

describe('useInterstitialAd', () => {
  beforeEach(() => {
    midgame.mockClear();
    admobShow.mockClear();
    h5Show.mockClear();
    cgFlag.value = false;
    nativeFlag.value = false;
  });

  it('CG path: dedupes same placement name', () => {
    cgFlag.value = true;
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('adventure-level-complete'); });
    act(() => { result.current.showInterstitial('adventure-level-complete'); });
    expect(midgame).toHaveBeenCalledTimes(1);
    expect(admobShow).not.toHaveBeenCalled();
    expect(h5Show).not.toHaveBeenCalled();
  });

  it('CG path: refires for distinct placement names', () => {
    cgFlag.value = true;
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('adventure-level-complete-1-1'); });
    act(() => { result.current.showInterstitial('adventure-level-complete-1-2'); });
    act(() => { result.current.showInterstitial('adventure-level-complete-1-3'); });
    expect(midgame).toHaveBeenCalledTimes(3);
  });

  it('Native path: AdMob fires, not CG or H5', () => {
    nativeFlag.value = true;
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('level-end'); });
    expect(admobShow).toHaveBeenCalledTimes(1);
    expect(midgame).not.toHaveBeenCalled();
    expect(h5Show).not.toHaveBeenCalled();
  });

  it('Web (non-prod, no test flag): no platform fires — placeholder by design', () => {
    // NODE_ENV='test' (vitest default). Without ?h5ads_test=1 we must not hit H5.
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('level-end'); });
    expect(midgame).not.toHaveBeenCalled();
    expect(admobShow).not.toHaveBeenCalled();
    expect(h5Show).not.toHaveBeenCalled();
  });

  it('Web with ?h5ads_test=1 AND NEXT_PUBLIC_H5_ADS_ENABLED=true: H5 fires', () => {
    const originalSearch = window.location.search;
    const originalEnv = process.env.NEXT_PUBLIC_H5_ADS_ENABLED;
    // happy-dom allows reconfiguring location.search via Object.defineProperty
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?h5ads_test=1' },
      writable: true,
    });
    process.env.NEXT_PUBLIC_H5_ADS_ENABLED = 'true';
    try {
      const { result } = renderHook(() => useInterstitialAd());
      act(() => { result.current.showInterstitial('level-end'); });
      expect(h5Show).toHaveBeenCalledTimes(1);
      expect(h5Show).toHaveBeenCalledWith('level-end');
    } finally {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: originalSearch },
        writable: true,
      });
      process.env.NEXT_PUBLIC_H5_ADS_ENABLED = originalEnv;
    }
  });

  it('?h5ads_test=1 alone (no env flag): H5 stays dormant', () => {
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?h5ads_test=1' },
      writable: true,
    });
    try {
      const { result } = renderHook(() => useInterstitialAd());
      act(() => { result.current.showInterstitial('level-end'); });
      expect(h5Show).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: originalSearch },
        writable: true,
      });
    }
  });

  // MP loop: ResultsPage unmounts (showResults=false) when match restarts and
  // remounts on next match end → fresh hook instance → fresh firedRef. Same
  // placement name 'multiplayer-round-complete' must re-fire across remounts.
  it('CG path: refires same placement name across hook remounts (MP rematch loop)', () => {
    cgFlag.value = true;
    for (let match = 0; match < 5; match++) {
      const { unmount, result } = renderHook(() => useInterstitialAd());
      act(() => { result.current.showInterstitial('multiplayer-round-complete'); });
      unmount();
    }
    expect(midgame).toHaveBeenCalledTimes(5);
  });
});
