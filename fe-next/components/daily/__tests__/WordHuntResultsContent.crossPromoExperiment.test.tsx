/**
 * Cross-promo position experiment wiring on WordHuntResultsContent.
 *
 * Variant 'wheel-first' (default): Wheel CTA renders before leaderboard.
 * Variant 'leaderboard-first': Wheel CTA renders after leaderboard.
 *
 * Both variants must call trackExposure() when the component mounts so
 * we get unbiased exposure stats matched against cross_promo_click conversions.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVariant = vi.fn<() => string>(() => 'wheel-first');
const mockTrackExposure = vi.fn();
const mockTrackHintExposure = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: (key: string) => ({
    variant: mockVariant(),
    trackExposure: key === 'wordhunt-crosspromo-position' ? mockTrackExposure : mockTrackHintExposure,
    _key: key,
  }),
}));

// hasPlayedWordWheelToday returns false → wheel CTA always renders
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: () => false,
  hasPlayedWordHuntToday: () => false,
  getPastWordHuntPerformance: () => null,
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
  default: function MockLeaderboard() {
    return <div data-testid="leaderboard">leaderboard</div>;
  },
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
  isAuthenticated: false,
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

function getOrderedTestIds(container: HTMLElement, ids: string[]): string[] {
  const all = Array.from(container.querySelectorAll('[data-testid]'));
  const set = new Set(ids);
  return all.map(el => el.getAttribute('data-testid')!).filter(id => set.has(id));
}

describe('WordHuntResultsContent — cross-promo position experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariant.mockReturnValue('wheel-first');
  });

  it('wheel-first: wheel CTA renders before leaderboard', () => {
    mockVariant.mockReturnValue('wheel-first');
    const { container } = render(<WordHuntResultsContent {...baseProps} />);
    const order = getOrderedTestIds(container, ['wordhunt-wheel-cta', 'leaderboard']);
    expect(order).toEqual(['wordhunt-wheel-cta', 'leaderboard']);
  });

  it('leaderboard-first: wheel CTA renders after leaderboard', () => {
    mockVariant.mockReturnValue('leaderboard-first');
    const { container } = render(<WordHuntResultsContent {...baseProps} />);
    const order = getOrderedTestIds(container, ['wordhunt-wheel-cta', 'leaderboard']);
    expect(order).toEqual(['leaderboard', 'wordhunt-wheel-cta']);
  });

  it('fires trackExposure once on mount', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(mockTrackExposure).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate exposure when component re-renders with same props', () => {
    const { rerender } = render(<WordHuntResultsContent {...baseProps} />);
    rerender(<WordHuntResultsContent {...baseProps} />);
    rerender(<WordHuntResultsContent {...baseProps} />);
    expect(mockTrackExposure).toHaveBeenCalledTimes(1);
  });

  it('renders only one wheel CTA regardless of variant', () => {
    mockVariant.mockReturnValue('leaderboard-first');
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getAllByTestId('wordhunt-wheel-cta')).toHaveLength(1);
  });
});
