/** The Word Hunt freeze modal and the home "freeze saved your streak" moment share one marker: only the first shows. */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { freezeToastKey } from '@/lib/daily/streakToastOnce';

const captured = vi.hoisted(() => ({ onFreezeBridged: null as null | ((p: { freezesRemaining: number }) => void) }));

// ── ResultsBannerSlot mock (added in 2026-05-05; pulls in useAdMob) ──────────
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('../results/NextQuestCta', () => ({ default: () => null, NextQuestCta: () => null }));

// ── Mascot mock ──────────────────────────────────────────────────────────────
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

// ── Language context ─────────────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// ── Auth context ─────────────────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: null,
    isAuthenticated: false,
  }),
}));

// ── Auth utils ───────────────────────────────────────────────────────────────
vi.mock('@/contexts/auth/authUtils', () => ({
  fetchGeolocation: vi.fn().mockResolvedValue({ countryCode: 'US' }),
}));

// ── Daily challenge utilities ────────────────────────────────────────────────
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
  shouldCelebrateStreakMilestone: () => false,
  findRarestWord: () => null,
}));

// ── Word normalization ───────────────────────────────────────────────────────
vi.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

// ── framer-motion ────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── next/image ───────────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── useDevicePerformance ─────────────────────────────────────────────────────
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

// ── Results sub-components ───────────────────────────────────────────────────
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
    copied: false,
    isGeneratingImage: false,
    ogImageUrl: null,
    showSharePanel: false,
    setShowSharePanel: vi.fn(),
  }),
  useResultSubmission: (opts: { onFreezeBridged?: (p: { freezesRemaining: number }) => void }) => {
    captured.onFreezeBridged = opts.onFreezeBridged ?? null;
  },
  useCoinActions: () => ({
    coinReward: { awarded: 10, breakdown: { base: 5, efficiency: 3, streak: 2 } },
    canAffordRetry: false,
    retryCost: 50,
    currentCoins: 0,
    revealCost: 20,
    targetWordRevealed: false,
    handleRetryChallenge: vi.fn(),
    handleRevealTargetWord: vi.fn(),
  }),
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
  DailyWordHuntFacts: () => <div data-testid="daily-word-hunt-facts" />,
  StatsBlurb: () => <div data-testid="stats-blurb" />,
  StreakFreezeIndicator: () => <div data-testid="streak-freeze-indicator" />,
}));

// ── Inline sub-components ────────────────────────────────────────────────────
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

vi.mock('../results/WordHuntResultsHero', () => ({
  WordHuntResultsHero: ({ children }: { children?: React.ReactNode }) => <section data-testid="daily-results-hero">{children}</section>,
}));


vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ── Celebration video fanfare mock (TDD for removal from daily results) ──────
vi.mock('@/components/mascot/MascotCelebrationVideo', () => ({
  MascotCelebrationVideo: (props: { kind?: string }) => (
    <div data-testid="mascot-celebration-video" data-kind={props.kind} />
  ),
}));

// ── GameFeedback ─────────────────────────────────────────────────────────────
vi.mock('@/components/feedback/GameFeedback', () => ({
  default: () => <div data-testid="game-feedback" />,
}));

// ── CrazyGames ──────────────────────────────────────────────────────────────
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesBanner', () => ({
  default: () => <div data-testid="crazy-games-banner" />,
}));

// ── Navigation context ──────────────────────────────────────────────────────
const setIsInGameSpy = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGameSpy,
}));

// ── Practice flag ──────────────────────────────────────────────────────────
vi.mock('@/hooks/usePracticeFlag', () => ({
  usePracticeFlag: () => false,
}));

// ── PracticeChainCta ──────────────────────────────────────────────────────
vi.mock('@/components/practice/PracticeChainCta', () => ({
  default: () => <div data-testid="practice-chain-cta" />,
}));

// ── StreakSavedCelebration ────────────────────────────────────────────────
vi.mock('../StreakSavedCelebration', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="streak-saved-celebration" /> : null),
}));

// ── Growth tracking ──────────────────────────────────────────────────────
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

// ── CollapsibleSection ──────────────────────────────────────────────────────
vi.mock('@/components/ui/CollapsibleSection', () => ({
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="collapsible-section">{title && <div>{title}</div>}{children}</div>
  ),
}));

// ── WordHunt utilities ──────────────────────────────────────────────────────
vi.mock('@/components/results/WordHuntTipBadge', () => ({
  default: () => <div data-testid="word-hunt-tip-badge" />,
}));

vi.mock('@/components/results/RejectedWordAppeal', () => ({
  RejectedWordAppeal: () => <div data-testid="rejected-word-appeal" />,
}));

vi.mock('@/components/daily/SuggestWordCard', () => ({
  SuggestWordCard: () => <div data-testid="suggest-word-card" />,
}));

vi.mock('@/components/daily/DailyInsightStack', () => ({
  default: () => <div data-testid="daily-insight-stack" />,
}));

vi.mock('@/hooks/useDailyModePlayed', () => ({
  useDailyModePlayed: () => ({ wordWheelPlayed: false }),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: null, trackExposure: vi.fn() }),
}));

vi.mock('@/lib/connections/dailyClient', () => ({
  hasPlayedConnectionsToday: () => false,
}));

vi.mock('@/hooks/useIsGuest', () => ({
  useIsGuest: () => true,
}));

// ── Hint exposure tracking ──────────────────────────────────────────────────
vi.mock('@/lib/experiments/trackHintExposure', () => ({
  default: vi.fn(),
}));

// ── import component AFTER all mocks ────────────────────────────────────────
import DailyWordHuntResults from '../DailyWordHuntResults';
import type { DailyWordHuntResultsProps } from '../results';

// ── Base result fixture ──────────────────────────────────────────────────────
const baseResult = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en' as const,
  solved: true,
  attemptsUsed: 3,
  targetWord: 'BRAVE',
  attempts: [],
  wordsDiscovered: [],
  lifeRemaining: 60,
  clueTokensEarned: 0,
  clueTokensSpent: 0,
  hintsUnlocked: 0,
  efficiencyScore: 0.5, // neutral — no mascot
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
  onBack: vi.fn(),
  onRetry: vi.fn(),
};

const yesterdayUtc = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

describe('DailyWordHuntResults - freeze saved shows once', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    captured.onFreezeBridged = null;
  });
  afterEach(() => vi.useRealTimers());

  it('opens the freeze modal and claims the shared marker so the home moment stays quiet', () => {
    render(<DailyWordHuntResults {...baseProps} />);
    act(() => captured.onFreezeBridged?.({ freezesRemaining: 1 }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId('streak-saved-celebration')).toBeInTheDocument();
    expect(localStorage.getItem(freezeToastKey('u1', yesterdayUtc()))).toBe('1');
  });

  it('skips the modal when the home moment already showed this save', () => {
    localStorage.setItem(freezeToastKey('u1', yesterdayUtc()), '1');
    render(<DailyWordHuntResults {...baseProps} />);
    act(() => captured.onFreezeBridged?.({ freezesRemaining: 1 }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByTestId('streak-saved-celebration')).toBeNull();
  });
});
