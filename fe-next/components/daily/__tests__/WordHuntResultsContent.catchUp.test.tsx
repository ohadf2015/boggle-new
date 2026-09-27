/**
 * The catch-up nudge ("you still have 2 unplayed dailies from the last few
 * days") used to live inside the "Full recap" disclosure on this screen.
 *
 * Post-gauntlet (2026-09-19): CatchUpSuggestion was removed from the Word
 * Hunt results screen entirely — it is still mounted on Word Wheel's results
 * (see WordWheelResults.tsx / WordWheelResults.fullRecap.test.tsx), just not
 * here. The first test below is the regression guard for that subtraction:
 * CatchUpSuggestion is mocked at its real import path, so if a future edit
 * re-adds it to WordHuntResultsContent, this test starts finding the mock's
 * testid and fails.
 *
 * This file deliberately does NOT stub out the disclosure: rendering it for
 * real is the only way the second test's assertion can fail if a detail card
 * moves out from behind it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWheelPlayed = vi.fn<() => boolean>(() => false);
const mockIsGuest = vi.fn<() => boolean>(() => false);

vi.mock('@/hooks/useDailyModePlayed', () => ({
  useDailyModePlayed: () => mockWheelPlayed(),
}));

vi.mock('@/hooks/useIsGuest', () => ({
  useIsGuest: () => mockIsGuest(),
  default: () => mockIsGuest(),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));

// Collapsed-by-default is the desktop behaviour too; pin the mobile branch.
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => false,
  useMediaQuery: () => false,
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: () => false,
  hasPlayedWordHuntToday: () => false,
  getPastWordHuntPerformance: () => null,
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot" />,
}));

vi.mock('../results', () => ({
  ResultDisplay: () => <div data-testid="result-display" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  StatsBlurb: () => <div data-testid="stats-blurb" />,
  PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
  DailyWordHuntFacts: () => <div data-testid="facts" />,
  EmojiShareCard: () => <div data-testid="emoji-share" />,
  ShareSection: () => <div data-testid="share-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  StreakFreezeIndicator: () => <div data-testid="streak-freeze" />,
  MasteryRatingSection: () => <div data-testid="mastery-rating-section" />,
}));

vi.mock('../CatchUpSuggestion', () => ({
  default: function MockCatchUp() { return <div data-testid="catch-up" />; },
}));

vi.mock('../DailyInsightStack', () => ({
  default: function MockInsightStack() { return <div data-testid="insight-stack" />; },
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  default: function MockLeaderboard() { return <div data-testid="leaderboard" />; },
}));

vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({
  default: function MockInlineSignup() { return <div data-testid="inline-signup" />; },
}));

vi.mock('../WatchAdButton', () => ({
  default: function MockWatchAdButton() { return <div data-testid="watch-ad" />; },
}));

vi.mock('@/components/ads/WatchAdForRevealButton', () => ({
  default: function MockWatchAdForRevealButton() { return <div data-testid="watch-ad-reveal" />; },
}));

vi.mock('@/components/results/NextStepPrompt', () => ({
  default: function MockNextStepPrompt() { return <div data-testid="next-step" />; },
}));

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
  } as unknown as WordHuntResultsContentProps['result'],
  puzzleNumber: 42,
  puzzleDate: '2026-03-14',
  language: 'en',
  countdown: '23:59:59',
  isNewCompletion: true,
  survivalBonusTime: 2,
  rarestWord: null,
  emojiWords: [],
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
    coinReward: null,
    handleRetryChallenge: vi.fn(),
    canAffordRetry: true,
    canAffordReveal: true,
    retryCost: 50,
    currentCoins: 100,
    targetWordRevealed: false,
    revealCost: 25,
    handleRevealTargetWord: vi.fn(),
    handleRevealTargetWordViaAd: vi.fn(),
  },
  isAuthenticated: true,
  inlineSignupDismissed: false,
  onInlineSignupDismiss: vi.fn(),
  leaderboardKey: 0,
  profile: null,
  guestFingerprint: null,
  onGameLanguageChange: vi.fn(),
  onShowCreatePuzzle: vi.fn(),
  onSpendStart: vi.fn(),
  t: (k: string, fallback?: string | Record<string, string | number>) =>
    typeof fallback === 'string' ? fallback : k,
};

describe('WordHuntResultsContent — catch-up nudge (removed from this screen)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWheelPlayed.mockReturnValue(false);
    mockIsGuest.mockReturnValue(false);
  });

  it('does not show the catch-up nudge (removed from Word Hunt results; still used by Word Wheel)', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('catch-up')).toBeNull();
  });

  it('keeps the analytics-heavy detail cards behind the disclosure', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('insight-stack')).toBeNull();
  });
});
