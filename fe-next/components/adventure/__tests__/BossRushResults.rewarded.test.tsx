/**
 * R5 — Boss Rush rewarded continue.
 * On run-over, watch-ad button grants a rush retry.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { showAd, capturedRewardRef } = vi.hoisted(() => ({
  showAd: vi.fn(),
  capturedRewardRef: { current: undefined as (() => void) | undefined },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="cg-banner" />,
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: () => void }) => {
    capturedRewardRef.current = opts.onRewardEarned;
    return {
      showAd,
      status: 'idle',
      isAdAvailable: true,
      isDailyLimitReached: false,
      canShowAd: true,
    };
  },
  AdStatus: {},
}));

import BossRushResults from '../BossRushResults';

const failedState = {
  isComplete: false,
  bossesDefeated: 2,
  totalBosses: 5,
  totalScore: 4200,
  startTime: Date.now() - 60_000,
  defeatedBosses: ['w1', 'w2', 'w3', 'w4', 'w5'],
} as any;

const winState = { ...failedState, isComplete: true, bossesDefeated: 5 };

describe('BossRushResults — rewarded continue (R5)', () => {
  beforeEach(() => { showAd.mockClear(); capturedRewardRef.current = undefined; });

  it('shows rewarded continue on failure', () => {
    render(<BossRushResults state={failedState} onRetry={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByTestId('rewarded-continue-btn')).toBeInTheDocument();
  });

  it('does NOT show rewarded continue on victory', () => {
    render(<BossRushResults state={winState} onRetry={vi.fn()} onExit={vi.fn()} />);
    expect(screen.queryByTestId('rewarded-continue-btn')).not.toBeInTheDocument();
  });

  it('click triggers showAd; reward calls onRetry', () => {
    const onRetry = vi.fn();
    render(<BossRushResults state={failedState} onRetry={onRetry} onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('rewarded-continue-btn'));
    expect(showAd).toHaveBeenCalledTimes(1);
    capturedRewardRef.current?.();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
