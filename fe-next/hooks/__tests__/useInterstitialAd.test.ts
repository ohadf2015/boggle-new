/**
 * I1 — Interstitial ad dedupe contract.
 * Same placement name fires once; distinct names refire.
 */
import { renderHook, act } from '@testing-library/react';

const { midgame, adsense, admobShow } = vi.hoisted(() => ({
  midgame: vi.fn(),
  adsense: vi.fn(),
  admobShow: vi.fn(),
}));

vi.mock('@/hooks/useCrazyGamesAds', () => ({
  useCrazyGamesAds: () => ({ requestMidgameAd: midgame }),
}));
vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ showInterstitial: adsense }),
}));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showInterstitial: admobShow }),
}));

import { useInterstitialAd } from '../useInterstitialAd';

describe('useInterstitialAd', () => {
  beforeEach(() => {
    midgame.mockClear();
    adsense.mockClear();
  });

  it('dedupes same placement name', () => {
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('adventure-level-complete'); });
    act(() => { result.current.showInterstitial('adventure-level-complete'); });
    expect(midgame).toHaveBeenCalledTimes(1);
  });

  it('refires for distinct placement names', () => {
    const { result } = renderHook(() => useInterstitialAd());
    act(() => { result.current.showInterstitial('adventure-level-complete-1-1'); });
    act(() => { result.current.showInterstitial('adventure-level-complete-1-2'); });
    act(() => { result.current.showInterstitial('adventure-level-complete-1-3'); });
    expect(midgame).toHaveBeenCalledTimes(3);
    expect(adsense).toHaveBeenCalledTimes(3);
  });
});
