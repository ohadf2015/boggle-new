/**
 * WatchAdButton — offered-event fires on mount.
 * Caller-supplied `surface` tags the placement for PostHog funnels.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: vi.fn(),
    error: null,
    rewardAmount: 25,
  }),
  AdStatus: {},
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ coins: 0, refreshCoins: vi.fn().mockResolvedValue(0) }),
}));

import WatchAdButton from '../WatchAdButton';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

describe('WatchAdButton analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fires trackRewardedAdOffered on mount with caller-supplied surface', () => {
    render(
      <WatchAdButton t={(k) => k} onCoinsEarned={() => {}} surface="daily_watch" />,
    );
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('daily_watch');
  });

  it('fires only once on re-render', () => {
    const { rerender } = render(
      <WatchAdButton t={(k) => k} onCoinsEarned={() => {}} surface="word_hunt_results" />,
    );
    rerender(
      <WatchAdButton t={(k) => k} onCoinsEarned={() => {}} surface="word_hunt_results" />,
    );
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
  });
});
