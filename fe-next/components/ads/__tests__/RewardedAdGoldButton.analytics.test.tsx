/**
 * RewardedAdGoldButton — offered-event fires on mount.
 *
 * Funnel entry point: whenever the CTA renders, caller-supplied `surface`
 * tags the placement so PostHog can split offer→watch conversion per UI.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

// Mutable hook state so each test can flip `canShowAd` (active ad provider).
const adState = vi.hoisted(() => ({
  current: {
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: vi.fn(),
    prepareAd: vi.fn(),
    error: null,
    rewardAmount: 25,
    canShowAd: true,
  },
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => adState.current,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', direction: 'ltr' }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

import { RewardedAdGoldButton } from '../RewardedAdGoldButton';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

describe('RewardedAdGoldButton analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adState.current.canShowAd = true;
  });

  it('does not fire offered when there is no active ad provider (canShowAd false)', () => {
    adState.current.canShowAd = false;
    render(<RewardedAdGoldButton goldAmount={20} surface="player_waiting" />);

    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });

  it('fires trackRewardedAdOffered on mount with caller-supplied surface', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="player_waiting" />);

    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('player_waiting');
  });

  it('fires only once even on re-render', () => {
    const { rerender } = render(
      <RewardedAdGoldButton goldAmount={25} surface="gold_top_up" />,
    );
    rerender(<RewardedAdGoldButton goldAmount={50} surface="gold_top_up" />);

    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('gold_top_up');
  });
});
