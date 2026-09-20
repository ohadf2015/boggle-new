/**
 * The primary next-step CTA on the Word Hunt results screen is pinned to the
 * bottom of the scrollport, so "finish today's challenge" / "back to the daily
 * hub" stays reachable without scrolling past the whole recap.
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
  MasteryRatingSection: () => <div data-testid="mastery-rating-section" />,
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

  it('pins the primary next-step CTA to the bottom of the scrollport', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    // The CTA itself is the shared NextQuestCta; the sticky positioning lives on
    // its wrapper, which is what this suite exists to protect.
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta.className).toContain('sticky');
  });

  it('renders exactly one primary CTA, whatever the state', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getAllByTestId('next-quest-cta')).toHaveLength(1);
    expect(screen.queryByTestId('next-quest-all-clear')).toBeNull();
  });

  it('offers a real next mode rather than the one just finished', () => {
    // Was two hardcoded nodes: a "STEP 2 OF 2 → Word Wheel" CTA and, once the
    // wheel was done, "back to the hub". Both predate Word Tower and
    // Connections going public, so a player with two modes still unplayed was
    // told the day was over. The replacement never names word-hunt.
    render(<WordHuntResultsContent {...baseProps} />);
    const next = screen.getByTestId('next-quest-cta').getAttribute('data-next-mode');
    expect(next).not.toBe('word-hunt');
    expect(next).toBeTruthy();
  });

  it('gives a guest the handoff inline, never pinned over their signup card', () => {
    // The original rule was "a guest gets no sticky CTA" — the pinned slot is
    // where their signup card lives. That still holds: the guest branch renders
    // the handoff in normal flow, so it cannot ride over the signup card, and
    // guests (~90% of daily players) are not left without a next step.
    mockIsGuest.mockReturnValue(true);
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} />);
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta.className).not.toContain('sticky');
  });
});
