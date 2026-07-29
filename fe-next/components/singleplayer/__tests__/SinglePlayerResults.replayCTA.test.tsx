/**
 * exp-results-replay-cta-v1 — quick-replay CTA experiment tests.
 *
 * TDD contract:
 *   RED  → tests written before UI implementation (experiment registered but no button)
 *   GREEN → quick-replay button rendered, wired to onPlayAgain, tracks results_cta_clicked
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SinglePlayerResults from '../SinglePlayerResults';

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
    t: (key: string) => {
      const map: Record<string, string> = {
        'results.playAgainQuestion': 'Run it back?',
        'nextStep.backToLobby': 'Back to Lobby',
        'nextStep.challengeBots': 'Challenge the Bots!',
        'nextStep.tryDailyChallenge': 'Try Daily Challenge',
        'nextStep.letsGo': "Let's Go!",
        'common.you': 'You',
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

vi.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
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
// useExperiment — module-level variant control
// ---------------------------------------------------------------------------

let experimentVariant = 'control';
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({
    variant: experimentVariant,
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
// AutoPlayCountdown immediately cancels so ctaBlock is visible
// ---------------------------------------------------------------------------

vi.mock('@/components/results/AutoPlayCountdown', () => {
  const MockAutoPlay = ({ onCancel }: { onCancel: () => void }) => {
    const ReactLib = require('react');
    ReactLib.useEffect(() => { onCancel(); }, [onCancel]);
    return null;
  };
  MockAutoPlay.displayName = 'MockAutoPlayCountdown';
  return { default: MockAutoPlay };
});

// ---------------------------------------------------------------------------
// Component mocks (all UI leaf components not under test)
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
vi.mock('@/components/results/Top3Leaderboard', () => ({ default: () => null }));
vi.mock('@/components/results/PlayerInsights', () => ({ default: () => null }));
vi.mock('@/components/results/CompactResultsStats', () => ({ default: () => null }));
vi.mock('@/components/results/BrainPointsDisplay', () => ({ default: () => null }));
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

const renderResults = () =>
  render(
    <SinglePlayerResults
      results={baseResults}
      mode="practice"
      onPlayAgain={mockOnPlayAgain}
      onBackToLobby={mockOnBackToLobby}
    />,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('exp-results-replay-cta-v1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    experimentVariant = 'control';
  });

  describe('results_viewed instrumentation', () => {
    it('fires results_viewed on mount regardless of variant', async () => {
      await act(async () => { renderResults(); });
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
        'results_viewed',
        expect.objectContaining({ mode: 'practice' }),
      );
    });
  });

  describe('control variant', () => {
    it('does NOT render quick-replay button', async () => {
      experimentVariant = 'control';
      await act(async () => { renderResults(); });
      expect(screen.queryByTestId('quick-replay-btn')).toBeNull();
    });

    it('still renders NextStepPrompt', async () => {
      experimentVariant = 'control';
      await act(async () => { renderResults(); });
      expect(screen.getByTestId('next-step-prompt')).toBeDefined();
    });
  });

  describe('quick-replay variant', () => {
    beforeEach(() => { experimentVariant = 'quick-replay'; });

    it('renders "Run it back?" button', async () => {
      await act(async () => { renderResults(); });
      expect(screen.getByTestId('quick-replay-btn')).toBeDefined();
      expect(screen.getByText('Run it back?')).toBeDefined();
    });

    it('calls onPlayAgain when button is clicked', async () => {
      const user = userEvent.setup();
      await act(async () => { renderResults(); });
      await user.click(screen.getByTestId('quick-replay-btn'));
      expect(mockOnPlayAgain).toHaveBeenCalledOnce();
    });

    it('tracks results_cta_clicked with cta=quick_replay on click', async () => {
      const user = userEvent.setup();
      await act(async () => { renderResults(); });
      await user.click(screen.getByTestId('quick-replay-btn'));
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
        'results_cta_clicked',
        expect.objectContaining({ cta: 'quick_replay' }),
      );
    });

    it('still renders NextStepPrompt below the quick-replay button', async () => {
      await act(async () => { renderResults(); });
      expect(screen.getByTestId('next-step-prompt')).toBeDefined();
    });
  });
});
