/**
 * Tests that WordHuntResultsContent renders the same sections
 * as were previously inline in DailyWordHuntResults.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all heavy dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, locale: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot" />,
}));
vi.mock('../results', () => ({
  ResultDisplay: () => <div data-testid="result-display" />,
  PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  DailyWordHuntFacts: () => <div data-testid="facts" />,
  EmojiShareCard: () => <div data-testid="emoji-share" />,
  ShareSection: () => <div data-testid="share-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({ default: function MockLeaderboard() { return <div data-testid="leaderboard" />; } }));
vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({ default: function MockInlineSignup() { return <div data-testid="inline-signup" />; } }));
vi.mock('../WatchAdButton', () => ({ default: function MockWatchAdButton() { return <div data-testid="watch-ad" />; } }));

import { WordHuntResultsContent, type WordHuntResultsContentProps } from '../WordHuntResultsContent';

const baseProps: WordHuntResultsContentProps = {
  result: {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    streakDays: 5,
    wordsDiscovered: [{ word: 'HELLO', lifeGained: 2, timestamp: Date.now(), tokensGained: 0 }],
    efficiencyScore: 85,
    lifeRemaining: 10,
    attempts: [],
    puzzleNumber: 42,
    puzzleDate: '2026-03-14',
    language: 'en' as const,
    completedAt: new Date().toISOString(),
  },
  puzzleNumber: 42,
  puzzleDate: '2026-03-14',
  language: 'en' as const,
  countdown: '23:59:59',
  isNewCompletion: true,
  survivalBonusTime: 2,
  rarestWord: null,
  emojiWords: [{ word: 'HELLO', found: true }],
  stats: null,
  shareHandlers: {
    handleNativeShare: vi.fn(),
    handleChallengeShare: vi.fn(),
    handleWhatsApp: vi.fn(),
    handleTwitter: vi.fn(),
    handleTelegram: vi.fn(),
    handleCopy: vi.fn(),
    handleDownloadShareImage: vi.fn(),
    handleLinkedIn: vi.fn(),
    handleFacebook: vi.fn(),
    handleEmail: vi.fn(),
    handleSMS: vi.fn(),
    copied: false,
    isGeneratingImage: false,
    showSharePanel: false,
    setShowSharePanel: vi.fn(),
    ogImageUrl: null,
  },
  coinActions: {
    coinReward: { awarded: 15, breakdown: { base: 10, streak: 5, efficiency: 0 } },
    handleRetryChallenge: vi.fn(),
    canAffordRetry: true,
    retryCost: 50,
    currentCoins: 100,
    targetWordRevealed: false,
    revealCost: 25,
    handleRevealTargetWord: vi.fn(),
  },
  isAuthenticated: false,
  inlineSignupDismissed: false,
  onInlineSignupDismiss: vi.fn(),
  leaderboardKey: 0,
  profile: null,
  guestFingerprint: null,
  onGameLanguageChange: vi.fn(),
  onShowCreatePuzzle: vi.fn(),
  onSpendStart: vi.fn(),
  t: ((k: string) => k) as WordHuntResultsContentProps['t'],
};

// Mock storage utility so we can control wordWheelPlayed state
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => false),
  hasPlayedWordHuntToday: vi.fn(() => false),
  getPastWordHuntPerformance: () => null,
}));

import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';

describe('WordHuntResultsContent', () => {
  it('renders core sections for a solved puzzle', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('result-display')).toBeInTheDocument();
    expect(screen.getByTestId('share-section')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('more-options')).toBeInTheDocument();
  });

  it('never renders a mascot (removed — looked weird over the score hero)', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('mascot')).toBeNull();
  });

  it('renders inline signup for guests when not dismissed', () => {
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} inlineSignupDismissed={false} />);
    expect(screen.getByTestId('inline-signup')).toBeInTheDocument();
  });

  describe('back-to-daily CTA (both challenges complete)', () => {
    it('shows back-to-daily link when word wheel already played', () => {
      (hasPlayedWordWheelToday as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<WordHuntResultsContent {...baseProps} onBackToLobby={vi.fn()} />);
      const link = screen.getByTestId('back-to-daily-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/en/daily');
    });

    it('does not show back-to-daily link when word wheel not yet played', () => {
      (hasPlayedWordWheelToday as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<WordHuntResultsContent {...baseProps} onBackToLobby={vi.fn()} />);
      expect(screen.queryByTestId('back-to-daily-link')).toBeNull();
    });
  });
});
