/**
 * TDD: EmojiShareCard in DailyWordHuntResults
 *
 * Tests that:
 * - EmojiShareCard renders when solved === true and words exist
 * - EmojiShareCard does NOT render when solved === false
 * - handleChallengeShare is passed to ShareSection as onChallengeShare
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Mascot mock ──────────────────────────────────────────────────────────────
jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

// ── Language context ─────────────────────────────────────────────────────────
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// ── Auth context ─────────────────────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));

// ── Auth utils ───────────────────────────────────────────────────────────────
jest.mock('@/contexts/auth/authUtils', () => ({
  fetchGeolocation: jest.fn().mockResolvedValue({ countryCode: 'US' }),
}));

// ── Daily challenge utilities ────────────────────────────────────────────────
jest.mock('@/utils/dailyChallenge', () => ({
  getGuestFingerprint: jest.fn().mockResolvedValue('test-fp'),
  getGuestDailyPlayer: jest.fn().mockResolvedValue({
    displayName: 'TestGuest',
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  }),
  getStreakMilestone: () => null,
  getStreakMilestoneMessage: () => null,
  findRarestWord: () => null,
}));

// ── Word normalization ───────────────────────────────────────────────────────
jest.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

// ── framer-motion ────────────────────────────────────────────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── next/image ───────────────────────────────────────────────────────────────
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── useDevicePerformance ─────────────────────────────────────────────────────
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableComplexAnimations: false,
  }),
}));

// ── react-dom createPortal ────────────────────────────────────────────────────
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// ── mockChallengeShare for verifying it gets passed through ──────────────────
const mockHandleChallengeShare = jest.fn();

// ── Results sub-components ───────────────────────────────────────────────────
jest.mock('../results', () => ({
  useShareHandlers: () => ({
    handleNativeShare: jest.fn(),
    handleWhatsApp: jest.fn(),
    handleTwitter: jest.fn(),
    handleTelegram: jest.fn(),
    handleLinkedIn: jest.fn(),
    handleFacebook: jest.fn(),
    handleEmail: jest.fn(),
    handleSMS: jest.fn(),
    handleCopy: jest.fn(),
    handleDownloadShareImage: jest.fn(),
    handleChallengeShare: mockHandleChallengeShare,
    copied: false,
    isGeneratingImage: false,
    ogImageUrl: null,
    showSharePanel: false,
    setShowSharePanel: jest.fn(),
  }),
  useResultSubmission: jest.fn(),
  useCoinActions: () => ({
    coinReward: { awarded: 10, breakdown: { base: 5, efficiency: 3, streak: 2 } },
    canAffordRetry: false,
    retryCost: 50,
    currentCoins: 0,
    revealCost: 20,
    targetWordRevealed: false,
    handleRetryChallenge: jest.fn(),
    handleRevealTargetWord: jest.fn(),
  }),
  useConfettiEffects: () => ({ handleBadgeClickConfetti: jest.fn() }),
  ScoreBadge: () => <div data-testid="score-badge" />,
  ResultDisplay: () => <div data-testid="result-display" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock-card" />,
  // ShareSection stub that exposes onChallengeShare for inspection
  ShareSection: ({ onChallengeShare }: { onChallengeShare?: () => void }) => (
    <div
      data-testid="share-section"
      data-has-challenge-share={String(typeof onChallengeShare === 'function')}
    />
  ),
  AttemptHistory: () => <div data-testid="attempt-history" />,
  StatsSection: () => <div data-testid="stats-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  SharePanel: () => <div data-testid="share-panel" />,
  EmojiShareCard: ({ words }: { words: Array<{ word: string; found: boolean }> }) => (
    <div data-testid="emoji-share-card" data-word-count={words.length} />
  ),
  DailyWordHuntFacts: () => <div data-testid="daily-word-hunt-facts" />,
}));

// ── Inline sub-components ────────────────────────────────────────────────────
jest.mock('@/components/auth/DailyChallengeInlineSignup', () =>
  function MockInlineSignup() {
    return <div data-testid="inline-signup" />;
  }
);

jest.mock('../StreakMilestoneCelebration', () =>
  function MockStreakMilestone() {
    return <div data-testid="streak-milestone" />;
  }
);

jest.mock('../TabbedDailyLeaderboard', () =>
  function MockLeaderboard() {
    return <div data-testid="tabbed-leaderboard" />;
  }
);

jest.mock('../WatchAdButton', () =>
  function MockWatchAd() {
    return <div data-testid="watch-ad" />;
  }
);

jest.mock('@/components/custom-puzzle/CustomPuzzleCreator', () =>
  function MockCustomPuzzle() {
    return <div data-testid="custom-puzzle" />;
  }
);

jest.mock('@/components/animations/CoinSpendAnimation', () => ({
  CoinSpendAnimation: () => <div data-testid="coin-spend" />,
}));

jest.mock('@/components/layout/MobileTabBar', () => ({
  MobileTabBar: () => <div data-testid="mobile-tab-bar" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

jest.mock('@/utils/mascotConfig', () => ({
  FLEXING_SCORE_THRESHOLD: 0.6,
  ENCOURAGING_SCORE_THRESHOLD: 0.4,
}));

jest.mock('../WinCinematic', () => ({
  WinCinematic: () => null,
}));

jest.mock('@/components/results/WordHuntPromoPopup', () => {
  const React = require('react');
  return React.forwardRef(function MockWordHuntPromoPopup(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    return React.createElement('div', { ...props, ref, 'data-testid': 'word-hunt-promo-popup' });
  });
});

// ── Import component AFTER all mocks ─────────────────────────────────────────
import DailyWordHuntResults from '../DailyWordHuntResults';
import type { DailyWordHuntResultsProps } from '../results';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const wordsDiscovered = [
  { word: 'BRAVE', lifeGained: 0, timestamp: 1000, tokensGained: 0 },
  { word: 'RAVEN', lifeGained: 5, timestamp: 2000, tokensGained: 0 },
];

const baseResult = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en' as const,
  solved: true,
  attemptsUsed: 3,
  targetWord: 'BRAVE',
  attempts: [],
  wordsDiscovered,
  lifeRemaining: 60,
  clueTokensEarned: 0,
  clueTokensSpent: 0,
  hintsUnlocked: 0,
  efficiencyScore: 0.5,
  streakDays: 1,
  completedAt: '2026-02-22T12:00:00Z',
};

const baseProps: DailyWordHuntResultsProps = {
  result: baseResult,
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en',
  countdown: '12:00:00',
  isNewCompletion: false,
  onBack: jest.fn(),
  onRetry: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('DailyWordHuntResults - EmojiShareCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders EmojiShareCard when solved=true and words exist', () => {
    render(<DailyWordHuntResults {...baseProps} />);
    // Component renders twice (mobile + desktop), at least one must appear
    const cards = screen.getAllByTestId('emoji-share-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('does NOT render EmojiShareCard when solved=false', () => {
    render(
      <DailyWordHuntResults
        {...baseProps}
        result={{ ...baseResult, solved: false, wordsDiscovered }}
      />
    );
    expect(screen.queryByTestId('emoji-share-card')).not.toBeInTheDocument();
  });

  it('does NOT render EmojiShareCard when solved=true but no words', () => {
    render(
      <DailyWordHuntResults
        {...baseProps}
        result={{ ...baseResult, solved: true, wordsDiscovered: [] }}
      />
    );
    expect(screen.queryByTestId('emoji-share-card')).not.toBeInTheDocument();
  });

  it('passes onChallengeShare to ShareSection when solved=true', () => {
    render(<DailyWordHuntResults {...baseProps} />);
    // Both mobile+desktop render ShareSection; at least one must have the prop
    const sections = screen.getAllByTestId('share-section');
    const hasChallenge = sections.some(
      (el) => el.getAttribute('data-has-challenge-share') === 'true'
    );
    expect(hasChallenge).toBe(true);
  });
});
