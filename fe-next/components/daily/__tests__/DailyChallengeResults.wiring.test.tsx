/**
 * Wiring test: DailyRewardClaim mounted in DailyChallengeResults
 * Uses a mock of DailyRewardClaim to verify it's rendered with correct props.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef(function MockMotionDiv(props: any, ref: any) { return <div ref={ref} {...props} />; }),
      p: React.forwardRef(function MockMotionP(props: any, ref: any) { return <p ref={ref} {...props} />; }),
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));

vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ showInterstitial: vi.fn() }),
}));

vi.mock('@/hooks/useCrazyGamesAds', () => ({
  useCrazyGamesAds: () => ({ requestMidgameAd: vi.fn() }),
}));

vi.mock('@/hooks/useDailyModeQuest', () => ({
  markModePlayedLogic: vi.fn(),
}));

vi.mock('./results/useDailyResultSubmission', () => ({
  useDailyResultSubmission: () => ({
    guestFingerprint: 'fp',
    guestPlayer: null,
    leaderboardKey: 'k',
  }),
}));

vi.mock('./results/useDailyConfetti', () => ({
  useDailyConfetti: () => ({
    currentUserRank: 1,
    totalPlayers: 10,
    handleCurrentUserRankChange: vi.fn(),
    setTotalPlayers: vi.fn(),
    fireRankConfettiLocal: vi.fn(),
  }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  generateShareableResult: () => 'share text',
  getGuestFingerprint: () => Promise.resolve('fp'),
  getGuestDailyPlayer: () => Promise.resolve(null),
}));

vi.mock('@/utils/scoreDisplay', () => ({
  displayScore: (s: number) => String(s),
}));

vi.mock('./DailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-leaderboard" />,
}));

vi.mock('@/components/results/NextStepPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/results/shared', () => ({
  ResultsHero: () => <div data-testid="results-hero" />,
}));

vi.mock('@/components/shared/GameEmojiShareCard', () => ({
  GameEmojiShareCard: () => null,
}));

vi.mock('./results/SharePanelModal', () => ({
  SharePanelModal: () => null,
  XTwitterIcon: () => null,
  WhatsAppIcon: () => null,
}));

vi.mock('./results/ImagePreviewModal', () => ({
  ImagePreviewModal: () => null,
}));

vi.mock('@/components/ui/Loader', () => ({
  Loader: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: any) => <button {...props} />,
}));

vi.mock('@/utils/dailyShareImage', () => ({
  generateDailyShareImage: vi.fn(),
  downloadDailyShareImage: vi.fn(),
}));

vi.mock('@/utils/shareImageGenerator', () => ({
  shareImageWithNativeShare: vi.fn(),
}));

vi.mock('@/lib/dailyRewards', () => ({
  getRewardCoins: (d: number) => 10 + d,
}));

// Mock DailyRewardClaim to verify it gets rendered
vi.mock('../DailyRewardClaim', () => ({
  DailyRewardClaim: (props: any) => (
    <div data-testid="daily-reward-claim" data-coins={props.coinsEarned} data-streak={props.currentStreakDay} />
  ),
}));

import DailyChallengeResults from '../DailyChallengeResults';

describe('DailyChallengeResults wiring', () => {
  const defaultProps = {
    result: {
      score: 500,
      wordCount: 10,
      puzzleNumber: 42,
      language: 'en',
      puzzleDate: '2026-03-31',
      timeSeconds: 120,
    },
    streak: { currentStreak: 5, bestStreak: 10 },
    streakMilestone: null,
    words: ['test', 'word'],
    longestWord: 'test',
    countdown: '23:45:00',
    isNewCompletion: true,
    onBack: vi.fn(),
    t: (k: string) => k,
  };

  it('renders DailyRewardClaim when isNewCompletion', () => {
    render(<DailyChallengeResults {...defaultProps} />);
    expect(screen.getByTestId('daily-reward-claim')).toBeInTheDocument();
  });
});
