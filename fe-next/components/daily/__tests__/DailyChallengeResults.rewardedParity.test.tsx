/**
 * Parity test: DailyChallengeResults should ship CrazyGames banner
 * + WatchAdButton (rewarded) like its sibling DailyWordHuntResults.
 * Monetization gap #B1 + #R1 — see CrazyGames audit.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyChallengeResults from '../DailyChallengeResults';
import type { DailyChallengeResult, DailyStreak } from '@/utils/dailyChallenge';

vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn(), isAvailable: false, isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle', isAdAvailable: true, isPlaceholderCooldown: false,
    showAd: vi.fn(), error: null, rewardAmount: 30, canShowAd: true,
    viewsToday: 0, maxViews: 10, isDailyLimitReached: false,
  }),
  AdStatus: {},
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardWatchedAd: vi.fn(), rewards: { WATCH_AD: 30 }, coins: 0 }),
}));
vi.mock('@/components/CrazyGamesBanner', () => {
  const Mock = () => <div data-testid="cg-banner" />;
  Mock.displayName = 'CrazyGamesBannerMock';
  return { __esModule: true, default: Mock };
});
vi.mock('../DailyLeaderboard', () => ({ __esModule: true, default: () => null }));
vi.mock('../results/useDailyConfetti', () => ({
  useDailyConfetti: () => ({
    currentUserRank: null, totalPlayers: 0,
    handleCurrentUserRankChange: vi.fn(), setTotalPlayers: vi.fn(),
    fireRankConfettiLocal: vi.fn(),
  }),
}));
vi.mock('../results/useDailyResultSubmission', () => ({
  useDailyResultSubmission: () => ({ guestFingerprint: null, guestPlayer: null, leaderboardKey: 'k' }),
}));

const t = (k: string) => k;
const result: DailyChallengeResult = {
  puzzleNumber: 1, puzzleDate: '2026-04-13', language: 'en',
  score: 100, wordCount: 5, timeSeconds: 60,
  wordsByLength: { 3: 2, 4: 3 },
} as unknown as DailyChallengeResult;
const streak: DailyStreak = { currentStreak: 3, longestStreak: 3, lastPlayedDate: '2026-04-13' } as DailyStreak;

describe('DailyChallengeResults — CrazyGames parity with WordHunt', () => {
  it('renders CrazyGames banner (gap B1)', () => {
    render(
      <DailyChallengeResults
        result={result} streak={streak} streakMilestone={null}
        words={['cat']} longestWord="cat" countdown="01:00:00"
        isNewCompletion onBack={vi.fn()} t={t}
      />,
    );
    expect(screen.getAllByTestId('cg-banner').length).toBeGreaterThan(0);
  });

  it('renders WatchAdButton rewarded CTA on new completion (gap R1)', () => {
    render(
      <DailyChallengeResults
        result={result} streak={streak} streakMilestone={null}
        words={['cat']} longestWord="cat" countdown="01:00:00"
        isNewCompletion onBack={vi.fn()} t={t}
      />,
    );
    // WatchAdButton renders a button with a coins icon and "+30" reward text
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });
});
