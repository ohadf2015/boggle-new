/**
 * supporter-card-sp-results — demand probe for a web "remove ads" nudge on
 * the singleplayer results screen, next to the existing gold rewarded-ad CTA.
 *
 * TDD contract:
 *   RED  → flag gate not wired, SupporterInterestCard never renders here
 *   GREEN → renders only when the PostHog flag is on
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SinglePlayerResults from '../SinglePlayerResults';

vi.mock('@/components/results/ResultsSocialSlot', () => ({ ResultsSocialSlot: () => null }));

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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
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
vi.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({ saveCognitiveScore: vi.fn().mockResolvedValue(null) }),
}));
vi.mock('@/hooks/useConsentDecided', () => ({ useConsentDecided: () => true }));
vi.mock('@/hooks/useAsyncChallengeProducer', () => ({ useAsyncChallengeProducer: vi.fn() }));

let flagValue = false;
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (key: string, defaultVal: unknown) =>
    key === 'supporter-card-sp-results' ? flagValue : defaultVal,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackSignupFunnel: vi.fn(),
  trackShare: vi.fn(),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));

vi.mock('@/utils/guestManager', () => ({
  updateGuestStatsAfterGame: vi.fn(),
  getGuestStats: () => ({ games: 0 }),
  getGuestName: () => 'Sly Fox',
  getGuestSessionId: () => null,
  ensureGuestDisplayName: () => 'Sly Fox',
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/gameLogger', () => ({
  logGameStart: vi.fn().mockResolvedValue(null),
  logGameEnd: vi.fn().mockResolvedValue(null),
  formatWordsForLogging: vi.fn().mockReturnValue([]),
}));
vi.mock('@/utils/gameHistoryManager', () => ({ addGameToHistory: vi.fn() }));

vi.mock('@/components/results/NextStepPrompt', () => ({ default: () => <div data-testid="next-step-prompt" /> }));
vi.mock('@/components/results/ResultsWinnerBanner', () => ({ default: () => <div data-testid="results-banner" /> }));
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
vi.mock('@/components/monetization/SupporterInterestCard', () => ({
  SupporterInterestCard: () => <div data-testid="supporter-interest-card" />,
}));
vi.mock('../results/components/CelebrationHero', () => ({
  CelebrationHero: () => <div data-testid="celebration-hero" />,
}));
vi.mock('../results/components/ResultsInfoCards', () => ({
  ResultsInfoCards: () => <div data-testid="results-info-cards" />,
}));

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

const renderResults = () =>
  render(
    <SinglePlayerResults
      results={baseResults}
      mode="practice"
      onPlayAgain={vi.fn()}
      onBackToLobby={vi.fn()}
    />,
  );

describe('SinglePlayerResults — supporter interest card (demand probe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagValue = false;
  });

  it('does not render when the flag is off', async () => {
    flagValue = false;
    await act(async () => { renderResults(); });
    expect(screen.queryByTestId('supporter-interest-card')).toBeNull();
  });

  it('renders next to the gold top-up when the flag is on', async () => {
    flagValue = true;
    await act(async () => { renderResults(); });
    expect(screen.getByTestId('supporter-interest-card')).toBeDefined();
  });
});
