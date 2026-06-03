/**
 * The Word Bridge (Connections) cross-promo on the Word Hunt results page must
 * NOT be shown when the player already played today's Connections daily.
 * Mirrors the wheel/hunt gating ("don't show a card for a mode already played").
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Wheel done → Connections cross-promo is eligible (en/he, after wheel).
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: () => true,
}));

const mockHasPlayedConnections = vi.fn(() => false);
vi.mock('@/lib/connections/dailyClient', () => ({
  hasPlayedConnectionsToday: () => mockHasPlayedConnections(),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'wheel-first', trackExposure: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/ui/Mascot', () => ({ MascotWithEntrance: () => <div data-testid="mascot" /> }));
vi.mock('../results', () => ({
  ResultDisplay: () => <div data-testid="result-display" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  StatsBlurb: () => <div data-testid="stats-blurb" />,
  DailyWordHuntFacts: () => <div data-testid="facts" />,
  EmojiShareCard: () => <div data-testid="emoji-share" />,
  ShareSection: () => <div data-testid="share-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  StreakFreezeIndicator: () => <div data-testid="streak-freeze" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({ default: () => <div data-testid="leaderboard" /> }));
vi.mock('../DailyInsightStack', () => ({ default: () => <div data-testid="insight-stack" /> }));
vi.mock('../CatchUpSuggestion', () => ({ default: () => <div data-testid="catch-up" /> }));
vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({ default: () => <div data-testid="inline-signup" /> }));
vi.mock('../WatchAdButton', () => ({ default: () => <div data-testid="watch-ad" /> }));
vi.mock('@/components/ads/WatchAdForRevealButton', () => ({ default: () => <div data-testid="watch-ad-reveal" /> }));

import { WordHuntResultsContent, type WordHuntResultsContentProps } from '../WordHuntResultsContent';

const baseProps: WordHuntResultsContentProps = {
  result: {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    streakDays: 5,
    wordsDiscovered: [],
    efficiencyScore: 85,
    lifeRemaining: 10,
    attempts: [],
    puzzleNumber: 42,
    puzzleDate: '2026-03-14',
    language: 'en' as const,
    completedAt: new Date().toISOString(),
  } as unknown as WordHuntResultsContentProps['result'],
  puzzleNumber: 42,
  puzzleDate: '2026-03-14',
  language: 'en',
  countdown: '23:59:59',
  isNewCompletion: true,
  showFlexing: false,
  showEncouraging: false,
  survivalBonusTime: 2,
  rarestWord: null,
  emojiWords: [],
  stats: null,
  shareHandlers: {
    handleNativeShare: vi.fn(), handleChallengeShare: vi.fn(), handleWhatsApp: vi.fn(),
    handleTwitter: vi.fn(), handleTelegram: vi.fn(), handleCopy: vi.fn(),
    handleDownloadShareImage: vi.fn(), handleLinkedIn: vi.fn(), handleFacebook: vi.fn(),
    handleEmail: vi.fn(), handleSMS: vi.fn(), copied: false, isGeneratingImage: false,
    showSharePanel: false, setShowSharePanel: vi.fn(), ogImageUrl: null,
  },
  coinActions: {
    coinReward: null, handleRetryChallenge: vi.fn(), canAffordRetry: true, canAffordReveal: true,
    retryCost: 50, currentCoins: 100, targetWordRevealed: false, revealCost: 25,
    handleRevealTargetWord: vi.fn(), handleRevealTargetWordViaAd: vi.fn(),
  },
  isAuthenticated: false,
  inlineSignupDismissed: true,
  onInlineSignupDismiss: vi.fn(),
  leaderboardKey: 0,
  profile: null,
  guestFingerprint: null,
  onGameLanguageChange: vi.fn(),
  onShowCreatePuzzle: vi.fn(),
  onSpendStart: vi.fn(),
  t: ((k: string, fallback?: string | Record<string, string | number>) =>
    typeof fallback === 'string' ? fallback : k) as WordHuntResultsContentProps['t'],
};

describe('WordHuntResultsContent — Connections cross-promo gating', () => {
  beforeEach(() => { vi.clearAllMocks(); window.localStorage.clear(); });

  it('shows the Connections cross-promo when it has NOT been played today', () => {
    mockHasPlayedConnections.mockReturnValue(false);
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('daily-connections-cross-promo')).toBeInTheDocument();
  });

  it('hides the Connections cross-promo when already played today', () => {
    mockHasPlayedConnections.mockReturnValue(true);
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('daily-connections-cross-promo')).toBeNull();
  });
});
