/**
 * I1 — Interstitial ad dedupe contract.
 * Same placement name fires once; distinct names refire.
 */
import { renderHook, act } from '@testing-library/react';

const { midgame, admobShow } = vi.hoisted(() => ({
  midgame: vi.fn(),
  admobShow: vi.fn(),
}));

vi.mock('@/hooks/useCrazyGamesAds', () => ({
  useCrazyGamesAds: () => ({ requestMidgameAd: midgame }),
}));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showInterstitial: admobShow }),
}));

import { useInterstitialAd } from '../useInterstitialAd';

describe('useInterstitialAd', () => {
  beforeEach(() => {
    midgame.mockClear();
    admobShow.mockClear();
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
    expect(admobShow).toHaveBeenCalledTimes(3);
  });

  // MP loop: ResultsPage unmounts (showResults=false) when match restarts and
  // remounts on next match end → fresh hook instance → fresh firedRef. Same
  // placement name 'multiplayer-round-complete' must re-fire across remounts.
  it('refires same placement name across hook remounts (MP rematch loop)', () => {
    for (let match = 0; match < 5; match++) {
      const { unmount, result } = renderHook(() => useInterstitialAd());
      act(() => { result.current.showInterstitial('multiplayer-round-complete'); });
      unmount();
    }
    expect(midgame).toHaveBeenCalledTimes(5);
    expect(admobShow).toHaveBeenCalledTimes(5);
  });
});
