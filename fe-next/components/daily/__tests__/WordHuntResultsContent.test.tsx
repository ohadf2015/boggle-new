/**
 * Tests that WordHuntResultsContent renders the same sections
 * as were previously inline in DailyWordHuntResults.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all heavy dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, locale: 'en' }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot" />,
}));
jest.mock('../results', () => ({
  ResultDisplay: () => <div data-testid="result-display" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  DailyWordHuntFacts: () => <div data-testid="facts" />,
  EmojiShareCard: () => <div data-testid="emoji-share" />,
  ShareSection: () => <div data-testid="share-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
}));
jest.mock('../TabbedDailyLeaderboard', () => () => <div data-testid="leaderboard" />);
jest.mock('@/components/auth/DailyChallengeInlineSignup', () => () => <div data-testid="inline-signup" />);
jest.mock('../WatchAdButton', () => () => <div data-testid="watch-ad" />);

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
  showFlexing: true,
  showEncouraging: false,
  survivalBonusTime: 2,
  rarestWord: null,
  emojiWords: [{ word: 'HELLO', found: true }],
  stats: null,
  shareHandlers: {
    handleNativeShare: jest.fn(),
    handleChallengeShare: jest.fn(),
    handleWhatsApp: jest.fn(),
    handleTwitter: jest.fn(),
    handleTelegram: jest.fn(),
    handleCopy: jest.fn(),
    handleDownloadShareImage: jest.fn(),
    handleLinkedIn: jest.fn(),
    handleFacebook: jest.fn(),
    handleEmail: jest.fn(),
    handleSMS: jest.fn(),
    copied: false,
    isGeneratingImage: false,
    showSharePanel: false,
    setShowSharePanel: jest.fn(),
    ogImageUrl: null,
  },
  coinActions: {
    coinReward: { awarded: 15, breakdown: { base: 10, streak: 5, efficiency: 0 } },
    handleRetryChallenge: jest.fn(),
    canAffordRetry: true,
    retryCost: 50,
    currentCoins: 100,
    targetWordRevealed: false,
    revealCost: 25,
    handleRevealTargetWord: jest.fn(),
  },
  isAuthenticated: false,
  inlineSignupDismissed: false,
  onInlineSignupDismiss: jest.fn(),
  leaderboardKey: 0,
  profile: null,
  guestFingerprint: null,
  onGameLanguageChange: jest.fn(),
  onShowCreatePuzzle: jest.fn(),
  onSpendStart: jest.fn(),
  t: ((k: string) => k) as WordHuntResultsContentProps['t'],
};

describe('WordHuntResultsContent', () => {
  it('renders core sections for a solved puzzle', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('result-display')).toBeInTheDocument();
    expect(screen.getByTestId('share-section')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('more-options')).toBeInTheDocument();
  });

  it('renders mascot when showFlexing is true', () => {
    render(<WordHuntResultsContent {...baseProps} showFlexing={true} showEncouraging={false} />);
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('renders inline signup for guests when not dismissed', () => {
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} inlineSignupDismissed={false} />);
    expect(screen.getByTestId('inline-signup')).toBeInTheDocument();
  });
});
