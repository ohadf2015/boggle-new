/**
 * TDD: WinCinematic wiring in DailyWordHuntResults
 *
 * Tests that:
 * - WinCinematic renders when isNewCompletion=true and result.solved=true
 * - WinCinematic does NOT render when isNewCompletion=false
 * - WinCinematic does NOT render when result.solved=false
 * - After onComplete fires, results content replaces the cinematic
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// ── ResultsBannerSlot mock (added in 2026-05-05; pulls in useAdMob) ──────────
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));

// ── WinCinematic mock — captures onComplete for use in tests ──────────────────
let capturedOnComplete: (() => void) | null = null;

vi.mock('../WinCinematic', () => ({
  __esModule: true,
  WinCinematic: ({ onComplete, puzzleNumber }: { onComplete: () => void; puzzleNumber: number }) => {
    capturedOnComplete = onComplete;
    return <div data-testid="win-cinematic" data-puzzle={puzzleNumber} />;
  },
}));

// ── Mascot mock ───────────────────────────────────────────────────────────────
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

// ── Language context ──────────────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// ── Auth context ──────────────────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));

// ── Auth utils ────────────────────────────────────────────────────────────────
vi.mock('@/contexts/auth/authUtils', () => ({
  fetchGeolocation: vi.fn().mockResolvedValue({ countryCode: 'US' }),
}));

// ── Daily challenge utilities ─────────────────────────────────────────────────
vi.mock('@/utils/dailyChallenge', () => ({
  getPastWordHuntPerformance: () => null,
  getGuestFingerprint: vi.fn().mockResolvedValue('test-fp'),
  getGuestDailyPlayer: vi.fn().mockResolvedValue({
    displayName: 'TestGuest',
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  }),
  getStreakMilestone: () => null,
  getStreakMilestoneMessage: () => null,
  findRarestWord: () => null,
}));

// ── Word normalization ────────────────────────────────────────────────────────
vi.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  m: {
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

// ── next/image ────────────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── useDevicePerformance ──────────────────────────────────────────────────────
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableComplexAnimations: false,
  }),
}));

// ── react-dom createPortal ────────────────────────────────────────────────────
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// ── Results sub-components ────────────────────────────────────────────────────
vi.mock('../results', () => ({
  useShareHandlers: () => ({
    handleNativeShare: vi.fn(),
    handleWhatsApp: vi.fn(),
    handleTwitter: vi.fn(),
    handleTelegram: vi.fn(),
    handleLinkedIn: vi.fn(),
    handleFacebook: vi.fn(),
    handleEmail: vi.fn(),
    handleSMS: vi.fn(),
    handleCopy: vi.fn(),
    handleDownloadShareImage: vi.fn(),
    handleChallengeShare: vi.fn(),
    copied: false,
    isGeneratingImage: false,
    ogImageUrl: null,
    showSharePanel: false,
    setShowSharePanel: vi.fn(),
  }),
  useResultSubmission: vi.fn(),
  useCoinActions: () => ({
    coinReward: { awarded: 10, breakdown: { base: 5, efficiency: 3, streak: 2 } },
    canAffordRetry: false,
    canAffordReveal: true,
    retryCost: 50,
    currentCoins: 0,
    revealCost: 20,
    targetWordRevealed: false,
    handleRetryChallenge: vi.fn(),
    handleRevealTargetWord: vi.fn(),
    handleRevealTargetWordViaAd: vi.fn(),
  }),
  useConfettiEffects: () => ({ handleBadgeClickConfetti: vi.fn() }),
  useSpendAnimation: () => ({ isVisible: false, position: { x: 0, y: 0 }, amount: 0, start: vi.fn(), hide: vi.fn() }),
  useStreakFreezeStatus: () => ({ freezesAvailable: 0, isStreakProtected: false }),
  ScoreBadge: () => <div data-testid="score-badge" />,
  ResultDisplay: () => <div data-testid="result-display" />,
  PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock-card" />,
  ShareSection: () => <div data-testid="share-section" />,
  AttemptHistory: () => <div data-testid="attempt-history" />,
  StatsSection: () => <div data-testid="stats-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  SharePanel: () => <div data-testid="share-panel" />,
  EmojiShareCard: () => <div data-testid="emoji-share-card" />,
  DailyWordHuntFacts: () => <div data-testid="daily-word-hunt-facts" />,
}));

// ── Inline sub-components ─────────────────────────────────────────────────────
vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({
  default: function MockInlineSignup() {
    return <div data-testid="inline-signup" />;
  },
}));

vi.mock('../StreakMilestoneCelebration', () => ({
  default: function MockStreakMilestone() {
    return <div data-testid="streak-milestone" />;
  },
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  default: function MockLeaderboard() {
    return <div data-testid="tabbed-leaderboard" />;
  },
}));

vi.mock('../WatchAdButton', () => ({
  default: function MockWatchAd() {
    return <div data-testid="watch-ad" />;
  },
}));

vi.mock('@/components/custom-puzzle/CustomPuzzleCreator', () => ({
  default: function MockCustomPuzzle() {
    return <div data-testid="custom-puzzle" />;
  },
}));

vi.mock('@/components/animations/CoinSpendAnimation', () => ({
  CoinSpendAnimation: () => <div data-testid="coin-spend" />,
}));

vi.mock('@/components/layout/MobileTabBar', () => ({
  MobileTabBar: () => <div data-testid="mobile-tab-bar" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@/utils/mascotConfig', () => ({
  FLEXING_SCORE_THRESHOLD: 0.6,
  ENCOURAGING_SCORE_THRESHOLD: 0.4,
}));

vi.mock('@/components/results/WordHuntPromoPopup', () => {
  const React = require('react');
  return React.forwardRef(function MockWordHuntPromoPopup(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    return React.createElement('div', { ...props, ref, 'data-testid': 'word-hunt-promo-popup' });
  });
});

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ── Import component AFTER all mocks ──────────────────────────────────────────
import DailyWordHuntResults from '../DailyWordHuntResults';
import type { DailyWordHuntResultsProps } from '../results';

// ── Fixtures ───────────────────────────────────────────────────────────────────
const baseResult = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en' as const,
  solved: true,
  attemptsUsed: 3,
  targetWord: 'BRAVE',
  attempts: [],
  wordsDiscovered: [
    { word: 'BRAVE', lifeGained: 0, timestamp: 1000, tokensGained: 0 },
  ],
  lifeRemaining: 60,
  clueTokensEarned: 0,
  clueTokensSpent: 0,
  hintsUnlocked: 0,
  efficiencyScore: 75,
  streakDays: 1,
  completedAt: '2026-02-22T12:00:00Z',
};

const baseProps: DailyWordHuntResultsProps = {
  result: baseResult,
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en',
  countdown: '12:00:00',
  isNewCompletion: true,
  onBack: vi.fn(),
  onRetry: vi.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('DailyWordHuntResults - WinCinematic wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnComplete = null;
  });

  it('renders WinCinematic when isNewCompletion=true and solved=true', () => {
    render(<DailyWordHuntResults {...baseProps} />);
    expect(screen.getByTestId('win-cinematic')).toBeInTheDocument();
  });

  it('does NOT render WinCinematic when isNewCompletion=false', () => {
    render(<DailyWordHuntResults {...baseProps} isNewCompletion={false} />);
    expect(screen.queryByTestId('win-cinematic')).not.toBeInTheDocument();
  });

  it('does NOT render WinCinematic when solved=false', () => {
    render(
      <DailyWordHuntResults
        {...baseProps}
        result={{ ...baseResult, solved: false }}
      />
    );
    expect(screen.queryByTestId('win-cinematic')).not.toBeInTheDocument();
  });

  it('shows results content after WinCinematic onComplete fires', () => {
    render(<DailyWordHuntResults {...baseProps} />);

    // Cinematic must be showing first
    expect(screen.getByTestId('win-cinematic')).toBeInTheDocument();

    // Fire the captured onComplete callback
    act(() => {
      capturedOnComplete?.();
    });

    // Cinematic should be gone, results should appear
    expect(screen.queryByTestId('win-cinematic')).not.toBeInTheDocument();
    expect(screen.getByTestId('score-badge')).toBeInTheDocument();
  });

  it('passes correct puzzleNumber to WinCinematic', () => {
    render(<DailyWordHuntResults {...baseProps} puzzleNumber={99} />);
    const cinematic = screen.getByTestId('win-cinematic');
    expect(cinematic).toHaveAttribute('data-puzzle', '99');
  });
});
