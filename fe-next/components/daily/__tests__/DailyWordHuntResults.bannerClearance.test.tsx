/**
 * TDD: AdMob banner / tab-bar clearance in DailyWordHuntResults
 *
 * Regression guard for "the daily challenge CTA is hidden behind the banner ad":
 * the fixed Results/Stats tab bar must clear the native AdMob banner overlay, and
 * the scroller must reserve room for both the tab bar height and the banner.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ── ResultsBannerSlot mock (added in 2026-05-05; pulls in useAdMob) ──────────
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));

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
    user: null,
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
  useResultSubmission: vi.fn(),
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

vi.mock('../WinCinematic', () => ({
  WinCinematic: () => null,
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

// ── Celebration video fanfare mock (TDD for removal from daily results) ──────
vi.mock('@/components/mascot/MascotCelebrationVideo', () => ({
  MascotCelebrationVideo: (props: { kind?: string }) => (
    <div data-testid="mascot-celebration-video" data-kind={props.kind} />
  ),
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

// ── Tests ────────────────────────────────────────────────────────────────────
describe('DailyWordHuntResults - banner/tab-bar clearance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Bug: the fixed Results/Stats tab bar sat at `bottom-0`. On native the AdMob
  // banner composites a SurfaceView above the WebView pinned to the viewport
  // bottom, so it covered the tab bar — the daily-challenge (Word Hunt) CTA was
  // hidden behind the banner. GlobalBottomNav is hidden on /daily, so the lift
  // must use --admob-banner-height directly (NOT --bottom-stack-height, whose
  // --bottom-nav-height stays at its ~64px :root fallback here and would float
  // the bar). Mirrors DailyWordHuntSurvival's word-forming-area offset.
  it('lifts the mobile tab bar above the AdMob banner (not a bare bottom-0)', () => {
    render(<DailyWordHuntResults {...baseProps} />);
    const wrapper = screen.getByTestId('mobile-tab-bar').parentElement;
    expect(wrapper).not.toBeNull();
    const cls = wrapper!.className;
    expect(cls).toContain('fixed');
    expect(cls).toMatch(/bottom-\[var\(--admob-banner-height/);
    expect(cls).not.toMatch(/(^|\s)bottom-0(\s|$)/);
  });

  // The scroller's old `pb-bottom-stack` (nav + banner) under-reserves: it omits
  // the ~80px tab-bar height (--mobile-bottom-safe), so the last CTA (retry /
  // share) clipped behind the now-lifted bar. Padding must clear tab bar + banner.
  it('reserves scroller bottom space for the tab bar height AND the banner', () => {
    const { container } = render(<DailyWordHuntResults {...baseProps} />);
    const scroller = container.querySelector('.scrollable-area');
    expect(scroller).not.toBeNull();
    const cls = (scroller as HTMLElement).className;
    expect(cls).toMatch(/--mobile-bottom-safe/);
    expect(cls).toMatch(/--admob-banner-height/);
  });
});
