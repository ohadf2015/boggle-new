/**
 * R2 — streak-save rewarded ad.
 * Watch an ad to earn a streak freeze (cap 3).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { showAdMock, earnFreezeMock, freezeCountRef } = vi.hoisted(() => ({
  showAdMock: vi.fn(),
  earnFreezeMock: vi.fn(),
  freezeCountRef: { current: 1 },
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: () => void } = {}) => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: () => {
      showAdMock();
      opts.onRewardEarned?.();
    },
    error: null,
    rewardAmount: 30,
    canShowAd: true,
    viewsToday: 0,
    maxViews: 10,
    isDailyLimitReached: false,
  }),
  AdStatus: {},
}));

vi.mock('@/hooks/useStreakFreeze', () => ({
  useStreakFreeze: () => ({ freezeCount: freezeCountRef.current, earnFreeze: earnFreezeMock, consumeFreeze: vi.fn() }),
  MAX_FREEZES: 3,
}));

import WatchAdForFreezeButton from '../WatchAdForFreezeButton';

const t = (k: string) => k;

describe('WatchAdForFreezeButton (R2)', () => {
  beforeEach(() => {
    showAdMock.mockClear();
    earnFreezeMock.mockClear();
    freezeCountRef.current = 1;
  });

  it('renders when freezeCount < MAX', () => {
    render(<WatchAdForFreezeButton t={t} surface="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows ad and grants a freeze on reward', () => {
    render(<WatchAdForFreezeButton t={t} surface="test" />);
    fireEvent.click(screen.getByRole('button'));
    expect(showAdMock).toHaveBeenCalled();
    expect(earnFreezeMock).toHaveBeenCalled();
  });

  it('renders nothing when freezes are at cap', () => {
    freezeCountRef.current = 3;
    const { container } = render(<WatchAdForFreezeButton t={t} surface="test" />);
    expect(container).toBeEmptyDOMElement();
  });
});
