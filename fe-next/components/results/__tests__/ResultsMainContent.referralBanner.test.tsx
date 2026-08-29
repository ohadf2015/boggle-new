/**
 * Referral CTA on the post-win results screen.
 *
 * The incentivized ReferralShareBanner (referral code + coin/XP reward)
 * previously only rendered on the leaderboard page — an opt-in nav path.
 * Every finished game across all modes routes through ResultsMainContent,
 * so mounting it here turns every completed game into an impression at the
 * highest-intent moment, without duplicating it for guests who already get
 * the signup CTA in the same slot.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/results/ResultsHeroSection', () => ({
  __esModule: true, default: () => <div data-testid="results-hero" />,
}));
vi.mock('@/components/results/ResultsPodium', () => ({
  __esModule: true, default: () => <div data-testid="results-podium" />,
}));
vi.mock('@/components/results/ConsolationRows', () => ({
  __esModule: true, default: () => null,
}));
vi.mock('@/components/results/HighlightsBar', () => ({
  __esModule: true, default: () => <div data-testid="highlights-bar" />,
}));
vi.mock('@/components/results/ResultsRevengeSection', () => ({
  ResultsRevengeSection: () => null,
}));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({
  __esModule: true, default: () => null,
}));
vi.mock('@/components/results/ResultsWordsSection', () => ({
  ResultsWordsSection: () => null,
}));
vi.mock('@/components/feedback/GameFeedback', () => ({
  __esModule: true, default: () => <div data-testid="game-feedback" />,
  GameFeedback: () => <div data-testid="game-feedback" />,
}));
vi.mock('@/components/auth/InlineSignupCard', () => ({
  __esModule: true, default: () => <div data-testid="inline-signup-card" />,
}));
vi.mock('@/components/referral/ReferralShareBanner', () => ({
  __esModule: true, default: () => <div data-testid="referral-share-banner" />,
}));
vi.mock('@/utils/consolationCrowns', () => ({
  assignConsolationCrowns: () => [],
}));
// Auth resolved — same fixture shape as the guest-simplification suite.
const auth = vi.hoisted(() => ({ current: { user: null, profile: null, isAuthenticated: false, loading: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));

import { ResultsMainContent } from '../ResultsMainContent';

const players = [
  { username: 'alice', score: 500, allWords: [] },
  { username: 'bob', score: 400, allWords: [] },
  { username: 'cara', score: 300, allWords: [] },
];

const baseProps = {
  sortedScores: players,
  nearMisses: [],
  isHost: false,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
  onExit: vi.fn(),
  winStreakData: null,
  isAuthenticated: true,
  currentPlayerData: { username: 'bob', score: 400, allWords: [] },
  isCurrentUserWinner: false,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  currentPlayerRank: 2,
  normalizeUsername: (n: string) => n || '',
  username: 'bob',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
} as unknown as React.ComponentProps<typeof ResultsMainContent>;

describe('ResultsMainContent — referral CTA', () => {
  it('shows the incentivized referral banner for a registered player', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated />);
    expect(screen.getByTestId('referral-share-banner')).toBeInTheDocument();
  });

  it('does not show the referral banner for a guest (they get the signup CTA instead)', () => {
    render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByTestId('referral-share-banner')).toBeNull();
    expect(screen.getByTestId('inline-signup-card')).toBeInTheDocument();
  });

  it('does not flash the referral banner while auth is still resolving', () => {
    auth.current = { ...auth.current, loading: true };
    try {
      render(<ResultsMainContent {...baseProps} isAuthenticated={false} />);
      expect(screen.queryByTestId('referral-share-banner')).toBeNull();
    } finally {
      auth.current = { ...auth.current, loading: false };
    }
  });
});
