/**
 * BossRushResults — offered-event fires when rewarded-continue CTA is visible
 * (i.e. on failure + canShowAd + not daily-limited).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { canShowAdRef, isDailyLimitReachedRef } = vi.hoisted(() => ({
  canShowAdRef: { current: true },
  isDailyLimitReachedRef: { current: false },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    status: 'idle',
    isAdAvailable: true,
    canShowAd: canShowAdRef.current,
    isDailyLimitReached: isDailyLimitReachedRef.current,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

import BossRushResults from '../BossRushResults';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

const baseState = {
  isComplete: false,
  totalScore: 100,
  startTime: Date.now() - 10_000,
  defeatedBosses: ['world-1'],
  bossesDefeated: 0,
  totalBosses: 3,
};

describe('BossRushResults analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canShowAdRef.current = true;
    isDailyLimitReachedRef.current = false;
  });

  it('fires offered on failure when CTA visible', () => {
    render(
      <BossRushResults state={baseState as never} onRetry={() => {}} onExit={() => {}} />,
    );
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('boss_rush_results');
  });

  it('does not fire on victory (CTA hidden)', () => {
    render(
      <BossRushResults
        state={{ ...baseState, isComplete: true } as never}
        onRetry={() => {}}
        onExit={() => {}}
      />,
    );
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });

  it('does not fire when daily limit reached (CTA hidden)', () => {
    isDailyLimitReachedRef.current = true;
    render(
      <BossRushResults state={baseState as never} onRetry={() => {}} onExit={() => {}} />,
    );
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });
});
