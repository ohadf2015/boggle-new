/**
 * The emoji-grid share card is the PRIMARY CTA on the Word Hunt results
 * screen: it renders directly under the result hero, before the leaderboard
 * and every recap/promo block, for guests and signed-in players alike, and
 * it receives the attempt history (per-letter feedback) as its emoji rows.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIsGuest = vi.fn<() => boolean>(() => false);
let capturedShareCardProps: Record<string, unknown> | null = null;

vi.mock('@/hooks/useDailyModePlayed', () => ({
  useDailyModePlayed: () => false,
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
  EmojiShareCard: (props: Record<string, unknown>) => {
    capturedShareCardProps = props;
    return <div data-testid="emoji-share" />;
  },
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

const attempts = [
  {
    word: 'HELLO',
    feedback: [
      { letter: 'H', feedback: 'green' as const },
      { letter: 'E', feedback: 'yellow' as const },
      { letter: 'L', feedback: 'gray' as const },
    ],
    timestamp: Date.now(),
  },
];

const baseProps: WordHuntResultsContentProps = {
  result: {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    streakDays: 5,
    wordsDiscovered: [{ word: 'HELLO', lifeGained: 2, timestamp: Date.now(), tokensGained: 0 }],
    efficiencyScore: 85,
    lifeRemaining: 10,
    attempts,
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
  emojiWords: attempts.map((a) => ({ word: a.word, found: false, feedback: a.feedback })),
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

describe('WordHuntResultsContent — share card as primary CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedShareCardProps = null;
    mockIsGuest.mockReturnValue(false);
  });

  it('renders the emoji share card right after the result hero, before the leaderboard', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    const hero = screen.getByTestId('result-display');
    const card = screen.getByTestId('emoji-share');
    const leaderboard = screen.getByTestId('leaderboard');
    expect(hero.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(leaderboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('feeds the attempt history (per-letter feedback) to the card as emoji rows', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(capturedShareCardProps).not.toBeNull();
    expect(capturedShareCardProps?.puzzleNumber).toBe(42);
    expect(capturedShareCardProps?.score).toBe(85);
    expect(capturedShareCardProps?.solved).toBe(true);
    const words = capturedShareCardProps?.words as Array<{ word: string; feedback?: unknown[] }>;
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('HELLO');
    expect(words[0].feedback).toHaveLength(3);
  });

  it('shows the share card to guests too — sharing is the guest\'s primary action', () => {
    mockIsGuest.mockReturnValue(true);
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} />);
    expect(screen.getByTestId('emoji-share')).toBeTruthy();
  });
});
