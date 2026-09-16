/**
 * autoPlayLoopGuard — regression test for the unattended-tab autoplay loop.
 *
 * Bug (root-caused): SinglePlayerResults renders AutoPlayCountdown with
 * onComplete={handlePlayAgainGated}. When the 5s countdown expires it starts
 * a new game; the component then unmounts, the game runs, results remount
 * with autoPlayCancelled back to false, and the countdown starts again. With
 * nobody touching the tab this loops forever (prod: 535 consecutive 0-score
 * games from one session).
 *
 * Fix under test: a module-level `consecutiveIdleAutoPlays` counter (mirrors
 * the results -> game -> results remount cycle within one tab session) stops
 * auto-replaying after MAX_CONSECUTIVE_IDLE_AUTOPLAYS unattended timeouts. A
 * player who finds at least one word, or a human click, resets the counter —
 * so a real player is never limited.
 *
 * Mock harness copied verbatim from the sibling
 * SinglePlayerResults.replayCTA.test.tsx, EXCEPT AutoPlayCountdown is left
 * UNMOCKED (the real component + fake timers drive the countdown), so a
 * useReducedMotion mock is added for it.
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import SinglePlayerResults, { __resetAutoPlayGuardForTests } from '../SinglePlayerResults';

// ---------------------------------------------------------------------------
// Core framework mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const M = () => null;
    return M;
  },
}));

vi.mock('@/utils/session', () => ({ clearSessionPreservingUsername: vi.fn() }));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, onClick }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} onClick={onClick}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'results.playAgainQuestion': 'Run it back?',
        'nextStep.backToLobby': 'Back to Lobby',
        'nextStep.challengeBots': 'Challenge the Bots!',
        'nextStep.tryDailyChallenge': 'Try Daily Challenge',
        'nextStep.letsGo': "Let's Go!",
        'common.you': 'You',
        'autoPlay.nextGameIn': `Next game in ${params?.seconds ?? 0}...`,
        'autoPlay.playAgain': 'autoPlay.playAgain',
        'autoPlay.exit': 'autoPlay.exit',
      };
      return map[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    profile: null,
    updateProfile: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardGameCompletion: vi.fn().mockResolvedValue(null),
    awardWatchedAd: vi.fn(),
    rewards: { WATCH_AD: 30 },
    coins: 0,
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 0, bestStreak: 0, lastWinDate: null, recordWin: vi.fn() }),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));

vi.mock('@/hooks/useAutoShowWithInteraction', () => ({ useAutoShowWithInteraction: vi.fn() }));
vi.mock('@/hooks/useWordHuntPromo', () => ({
  useWordHuntPromo: () => ({ canShow: false, recordImpression: vi.fn() }),
}));
vi.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({ saveCognitiveScore: vi.fn().mockResolvedValue(null) }),
}));
vi.mock('@/hooks/useConsentDecided', () => ({ useConsentDecided: () => true }));
vi.mock('@/hooks/useUnfinishedBoard', () => ({
  useUnfinishedBoard: () => ({ saveUnfinishedBoard: vi.fn(), unfinishedBoard: null }),
}));
vi.mock('@/hooks/useAsyncChallengeProducer', () => ({ useAsyncChallengeProducer: vi.fn() }));

vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (_key: string, defaultVal: string) => defaultVal,
}));

// AutoPlayCountdown renders for real in this file — needs its own reduced-motion hook.
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Analytics spy (must be before useExperiment which imports it)
// ---------------------------------------------------------------------------

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
  trackSignupFunnel: vi.fn(),
  trackShare: vi.fn(),
}));

// ---------------------------------------------------------------------------
// useExperiment — module-level variant control (kept at 'control' so the
// quick-replay CTA never masks the NextStepPrompt fallback marker)
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({
    variant: 'control',
    trackExposure: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Utility mocks
// ---------------------------------------------------------------------------

vi.mock('@/utils/guestManager', () => ({
  updateGuestStatsAfterGame: vi.fn(),
  getGuestStats: () => ({ games: 0 }),
  getGuestName: () => 'Guest',
  getGuestSessionId: () => null,
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/gameLogger', () => ({
  logGameStart: vi.fn().mockResolvedValue(null),
  logGameEnd: vi.fn().mockResolvedValue(null),
  formatWordsForLogging: vi.fn().mockReturnValue([]),
}));
vi.mock('@/utils/gameHistoryManager', () => ({ addGameToHistory: vi.fn() }));

// ---------------------------------------------------------------------------
// Component mocks (all UI leaf components not under test).
// NOTE: AutoPlayCountdown is intentionally NOT mocked here — the real
// component + fake timers is how this file drives timeout/click behavior.
// ---------------------------------------------------------------------------

vi.mock('@/components/results/NextStepPrompt', () => ({
  default: () => <div data-testid="next-step-prompt" />,
}));

vi.mock('@/components/results/ResultsWinnerBanner', () => ({
  default: () => <div data-testid="results-banner" />,
}));

vi.mock('@/components/results/PlayerArchetypeBadge', () => ({ default: () => null }));
vi.mock('@/components/results/BonusBadgesRow', () => ({ default: () => null }));
vi.mock('@/components/results/CoinRewardDisplay', () => ({ default: () => null }));
vi.mock('@/components/results/PlayerInsights', () => ({ default: () => null }));
vi.mock('@/components/results/RewardsSummary', () => ({ default: () => null }));
vi.mock('@/components/results/MissedWords', () => ({ default: () => null }));
vi.mock('@/components/results/WordPointsGroup', () => ({
  WordPointsGroup: () => null,
  InvalidWordsSection: () => null,
}));
vi.mock('@/components/AchievementBadge', () => ({ AchievementBadge: () => null }));
vi.mock('@/components/layout/MobileTabBar', () => ({ MobileTabBar: () => null }));
vi.mock('@/components/voting/WordFeedbackModal', () => ({ default: () => null }));
vi.mock('@/components/training', () => ({ TrainingAnalysisModal: () => null }));
vi.mock('../results/components/SinglePlayerGoldTopUp', () => ({ default: () => null }));
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({ default: () => null }));
vi.mock('../results/components/CelebrationHero', () => ({
  CelebrationHero: () => <div data-testid="celebration-hero" />,
}));
vi.mock('../results/components/ResultsInfoCards', () => ({
  ResultsInfoCards: () => <div data-testid="results-info-cards" />,
}));

// ---------------------------------------------------------------------------
// results barrel — hooks + component stubs
// ---------------------------------------------------------------------------

vi.mock('../results', () => ({
  useResultsData: () => ({
    allParticipants: [{ name: 'You', score: 100, isPlayer: true }],
    playerRank: 1,
    isWinner: true,
    playerInsights: null,
    wordsByPoints: {},
    sortedPointGroups: [],
    invalidWords: [],
    totalComboBonus: 0,
    totalFireRoundBonus: 0,
    botWordDetails: [],
    playerArchetype: null,
    missedWords: [],
  }),
  useGuestStatsSync: () => ({ hasUpdatedStats: true }),
  useLeaderboardSync: () => ({ globalRank: null }),
  useGameHistory: () => {},
  useGameSessionLogging: () => {},
  useCoinRewards: () => ({ coinReward: null }),
  useWinStreakTracking: () => {},
  useAchievementsSave: () => {},
  useWordValidation: () => ({
    wordValidationQueue: [],
    showWordValidation: false,
    setShowWordValidation: vi.fn(),
    handleWordVote: vi.fn(),
  }),
  useBannerConfig: () => ({ variant: 'completion', message: undefined, announcement: undefined }),
  useSharePromptImpression: () => {},
  GlobalRankBadge: () => null,
  PerformanceSection: () => null,
  YourWordsSection: () => null,
  AchievementsSection: () => null,
  BotWordsSection: () => null,
  ChallengeButton: () => null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseResults = {
  playerScore: 120,
  playerWords: ['word'],
  playerWordData: [{ word: 'word', isValid: true, score: 4, timestamp: Date.now(), timeSinceStart: 3 }],
  botScores: [],
  grid: [['W', 'O'], ['R', 'D']],
  gameDuration: 90,
  language: 'en' as const,
  gameSessionId: 'test-session',
  allPossibleWords: ['word'],
  isNewHighScore: false,
};

const mockOnPlayAgain = vi.fn();
const mockOnBackToLobby = vi.fn();

const renderResults = (overrides: Partial<typeof baseResults> = {}) =>
  render(
    <SinglePlayerResults
      results={{ ...baseResults, ...overrides }}
      mode="practice"
      onPlayAgain={mockOnPlayAgain}
      onBackToLobby={mockOnBackToLobby}
    />,
  );

const countdownRing = () => screen.queryByRole('button', { name: 'autoPlay.playAgain' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SinglePlayerResults — autoplay loop guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    __resetAutoPlayGuardForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops the idle auto-play loop after 3 consecutive unattended timeouts', async () => {
    // Given a tab that never gets touched, scoring 0 every round.
    for (let round = 0; round < 3; round++) {
      const { unmount } = renderResults({ playerScore: 0, playerWords: [] });
      expect(countdownRing()).toBeInTheDocument();
      // When each countdown times out unattended.
      await act(async () => { vi.advanceTimersByTime(5000); });
      unmount();
    }

    // Then the 4th mount must NOT auto-replay — the normal CTA branch renders instead.
    renderResults({ playerScore: 0, playerWords: [] });
    expect(countdownRing()).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('next-step-prompt')).toBeInTheDocument();
  });

  it('never limits an active player across repeated auto-replays', async () => {
    // Given a real player who finds a word every round.
    for (let round = 0; round < 5; round++) {
      const { unmount } = renderResults({ playerScore: 120, playerWords: ['cat'] });
      expect(countdownRing()).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(5000); });
      unmount();
    }

    // Then the countdown still renders — an active player is never gated.
    renderResults({ playerScore: 120, playerWords: ['cat'] });
    expect(countdownRing()).toBeInTheDocument();
  });

  it('a human click on the countdown ring resets the idle streak', async () => {
    // Given 2 unattended idle timeouts.
    for (let round = 0; round < 2; round++) {
      const { unmount } = renderResults({ playerScore: 0, playerWords: [] });
      await act(async () => { vi.advanceTimersByTime(5000); });
      unmount();
    }

    // When the next mount's ring is CLICKED (a human action) instead of timing out.
    {
      const { unmount } = renderResults({ playerScore: 0, playerWords: [] });
      const ring = countdownRing();
      expect(ring).toBeInTheDocument();
      fireEvent.click(ring as HTMLElement);
      unmount();
    }

    // Then the round right after the click chain still auto-replays — the click zeroed the counter.
    const { unmount } = renderResults({ playerScore: 0, playerWords: [] });
    expect(countdownRing()).toBeInTheDocument();
    unmount();

    // And idle timeouts still accumulate normally from that reset baseline.
    for (let round = 0; round < 3; round++) {
      const { unmount: u } = renderResults({ playerScore: 0, playerWords: [] });
      await act(async () => { vi.advanceTimersByTime(5000); });
      u();
    }
    renderResults({ playerScore: 0, playerWords: [] });
    expect(countdownRing()).toBeNull();
  });
});
