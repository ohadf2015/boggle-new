/**
 * The primary CTA on the Word Hunt results screen is the SHARE CARD, pinned to
 * the bottom of the scrollport (gauntlet-2: the emoji-grid result is the growth
 * loop, so "share my result" is always one tap away). The wheel cross-promo /
 * back-to-daily-hub next-step CTAs are demoted to inline below it.
 *
 * `position: sticky` (not `fixed`) is deliberate — every CTA sits inside a
 * Framer `m.div` transform ancestor, which turns `fixed` into `absolute`
 * (see the portal comment in components/views/ResultsPage.tsx). Sticky is
 * unaffected by transformed ancestors, and it also survives this component
 * being mounted twice (mobile `md:hidden` + desktop `hidden md:block` columns
 * in DailyWordHuntResults) without producing two floating bars.
 *
 * A guest never gets a sticky CTA: their screen is score + leaderboard + one
 * signup CTA (see guest-simplified result screens), and a second pinned CTA
 * would compete with it.
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

describe('WordHuntResultsContent — sticky primary CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWheelPlayed.mockReturnValue(false);
    mockIsGuest.mockReturnValue(false);
  });

  it('pins the share card as the sticky primary CTA', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('wordhunt-share-cta').className).toContain('sticky');
  });

  it('keeps the "finish today\'s challenge" CTA inline when the wheel is unplayed', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('wordhunt-wheel-cta').className).not.toContain('sticky');
  });

  it('keeps the back-to-daily-hub CTA inline once the wheel is done', () => {
    mockWheelPlayed.mockReturnValue(true);
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('wordhunt-back-to-daily-cta').className).not.toContain('sticky');
  });

  it('renders exactly one sticky primary CTA per state', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getAllByTestId('wordhunt-share-cta')).toHaveLength(1);
    expect(screen.getAllByTestId('wordhunt-wheel-cta')).toHaveLength(1);
    expect(screen.queryByTestId('wordhunt-back-to-daily-cta')).toBeNull();
  });

  it('gives a guest no sticky CTA — the signup card is their only one', () => {
    mockIsGuest.mockReturnValue(true);
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByTestId('wordhunt-share-cta')).toBeNull();
    expect(screen.queryByTestId('wordhunt-wheel-cta')).toBeNull();
    expect(screen.queryByTestId('wordhunt-back-to-daily-cta')).toBeNull();
  });
});
