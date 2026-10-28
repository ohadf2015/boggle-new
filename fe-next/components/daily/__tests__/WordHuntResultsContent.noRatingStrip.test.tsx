/**
 * The Mastery Rating strip ("Rating 93 / Change +0") duplicated the score
 * hero and the stats tab, so it was removed from the Word Hunt results. This
 * stub keeps the old testid alive: if anything mounts the strip again the
 * assertions below fail instead of passing vacuously.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWheelPlayed = vi.fn<() => boolean>(() => false);
const mockIsGuest = vi.fn<() => boolean>(() => false);
const mockLanguage = vi.fn<() => string>(() => 'en');

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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage(), t: (k: string) => k }),
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

// Heavy siblings are stubbed.
vi.mock('../results/WordHuntResultsHero', () => ({
  WordHuntResultsHero: ({ children }: { children?: React.ReactNode }) => <section data-testid="daily-results-hero">{children}</section>,
}));
vi.mock('../results/CoinUnlockCard', () => ({ CoinUnlockCard: () => <div data-testid="coin-unlock" /> }));
vi.mock('../results', async () => {
  return {
    ResultDisplay: () => <div data-testid="result-display" />,
    PerformanceSection: () => <div data-testid="performance-section" />,
    RankBadge: () => <div data-testid="rank-badge" />,
    StatsBlurb: () => <div data-testid="stats-blurb" />,
    PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
    DailyWordHuntFacts: () => <div data-testid="facts" />,
      ShareSection: () => <div data-testid="share-section" />,
    CoinUnlockCard: () => <div data-testid="coin-unlock" />,
    MoreOptionsAccordion: () => <div data-testid="more-options" />,
    StreakFreezeIndicator: () => <div data-testid="streak-freeze" />,
    MasteryRatingSection: () => <div data-testid="mastery-rating" />,
  };
});

vi.mock('../TabbedDailyLeaderboard', () => ({
  default: function MockLeaderboard() { return <div data-testid="leaderboard" />; },
}));

vi.mock('@/components/daily/results/DismissibleSignupLine', () => ({
  __esModule: true,
  default: function MockSignupLine() { return <div data-testid="signup-line" />; },
  isSignupLineDismissedLocally: () => false,
}));

vi.mock('@/components/daily/results/ResultsSignupModal', () => ({
  __esModule: true,
  default: function MockSignupModal() { return <div data-testid="signup-modal" />; },
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

function buildProps(overrides: Partial<WordHuntResultsContentProps>): WordHuntResultsContentProps {
  return {
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
    profile: { id: 'player-1' },
    guestFingerprint: null,
    onGameLanguageChange: vi.fn(),
    onShowCreatePuzzle: vi.fn(),
    onSpendStart: vi.fn(),
    t: (k: string, fallback?: string | Record<string, string | number>) =>
      typeof fallback === 'string' ? fallback : k,
    ...overrides,
  } as WordHuntResultsContentProps;
}

describe('WordHuntResultsContent — no mastery rating strip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWheelPlayed.mockReturnValue(false);
    mockIsGuest.mockReturnValue(false);
    mockLanguage.mockReturnValue('en');
  });

  it.each([
    ['authed', 'win', false, true],
    ['authed', 'loss', false, false],
    ['guest', 'win', true, true],
    ['guest', 'loss', true, false],
  ])('does not render the rating strip for %s on a %s', (_who, _outcome, guest, solved) => {
    mockIsGuest.mockReturnValue(guest);
    const base = buildProps({});
    render(
      <WordHuntResultsContent
        {...buildProps({
          isAuthenticated: !guest,
          profile: guest ? null : { id: 'player-1' },
          guestFingerprint: guest ? 'guest-fp-1' : null,
          result: { ...base.result, solved },
        })}
      />,
    );
    expect(screen.queryByTestId('mastery-rating')).toBeNull();
  });
});
