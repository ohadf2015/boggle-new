/**
 * R7 — SP double-gold rewarded top-up.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import SinglePlayerGoldTopUp from '../components/SinglePlayerGoldTopUp';

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle', isAdAvailable: true, isPlaceholderCooldown: false,
    showAd: vi.fn(), error: null, rewardAmount: 30, canShowAd: true,
    viewsToday: 0, maxViews: 10, isDailyLimitReached: false,
  }),
  AdStatus: {},
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ coins: 0, refreshCoins: vi.fn(async () => 30), rewards: { WATCH_AD: 30 }, awardWatchedAd: vi.fn() }),
}));

describe('SinglePlayerGoldTopUp (R7)', () => {
  it('renders WatchAdButton with reward amount', () => {
    render(<SinglePlayerGoldTopUp t={(k: string) => k} />);
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });
});
