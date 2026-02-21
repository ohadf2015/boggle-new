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

// ── WinCinematic mock — captures onComplete for use in tests ──────────────────
let capturedOnComplete: (() => void) | null = null;

jest.mock('../WinCinematic', () => ({
  __esModule: true,
  WinCinematic: ({ onComplete, puzzleNumber }: { onComplete: () => void; puzzleNumber: number }) => {
    capturedOnComplete = onComplete;
    return <div data-testid="win-cinematic" data-puzzle={puzzleNumber} />;
  },
}));

// ── Mascot mock ───────────────────────────────────────────────────────────────
jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

// ── Language context ──────────────────────────────────────────────────────────
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// ── Auth context ──────────────────────────────────────────────────────────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));

// ── Auth utils ────────────────────────────────────────────────────────────────
jest.mock('@/contexts/auth/authUtils', () => ({
  fetchGeolocation: jest.fn().mockResolvedValue({ countryCode: 'US' }),
}));

// ── Daily challenge utilities ─────────────────────────────────────────────────
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

// ── Word normalization ────────────────────────────────────────────────────────
jest.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

// ── framer-motion ─────────────────────────────────────────────────────────────
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

// ── next/image ────────────────────────────────────────────────────────────────
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── useDevicePerformance ──────────────────────────────────────────────────────
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

// ── Results sub-components ────────────────────────────────────────────────────
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
    handleChallengeShare: jest.fn(),
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
  ShareSection: () => <div data-testid="share-section" />,
  AttemptHistory: () => <div data-testid="attempt-history" />,
  StatsSection: () => <div data-testid="stats-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  SharePanel: () => <div data-testid="share-panel" />,
  EmojiShareCard: () => <div data-testid="emoji-share-card" />,
}));

// ── Inline sub-components ─────────────────────────────────────────────────────
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
  onBack: jest.fn(),
  onRetry: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('DailyWordHuntResults - WinCinematic wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
