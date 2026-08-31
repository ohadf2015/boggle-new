import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SinglePlayerResults from '../SinglePlayerResults';

// Track navigation
const mockRouterPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock session utility
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockComponent = () => null;
    return MockComponent;
  },
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nextStep.challengeBots': 'Challenge the Bots!',
        'nextStep.challengeBotsDesc': 'Test your skills against AI opponents',
        'nextStep.tryDailyChallenge': 'Try Daily Challenge',
        'nextStep.tryDailyChallengeDesc': 'Same puzzle for everyone worldwide - compete globally!',
        'nextStep.backToLobby': 'Back to Lobby',
        'nextStep.letsGo': "Let's Go!",
        'common.you': 'You',
        'common.score': 'Score',
        'common.words': 'Words',
        'singlePlayer.victory': 'Victory!',
        'results.of': 'of',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    profile: null,
    updateProfile: vi.fn(),
    loading: false,
  }),
}));

// Mock CoinContext
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardGameCompletion: vi.fn().mockResolvedValue(null),
    awardWatchedAd: vi.fn(),
    rewards: { WATCH_AD: 30 },
    coins: 0,
  }),
}));

// Mock hooks
vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    currentStreak: 0,
    bestStreak: 0,
    lastWinDate: null,
    recordWin: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useAutoShowWithInteraction', () => ({
  useAutoShowWithInteraction: vi.fn(),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
  default: () => ({ showInterstitial: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/hooks/useWordHuntPromo', () => ({
  useWordHuntPromo: () => ({
    canShow: false,
    recordImpression: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: () => 'control',
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

vi.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({
    saveCognitiveScore: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock AutoPlayCountdown — immediately call onCancel so NextStepPrompt renders
vi.mock('@/components/results/AutoPlayCountdown', () => {
  const MockAutoPlay = ({ onCancel }: { onCancel: () => void }) => {
    // Simulate cancelled state so tests see NextStepPrompt
    const React = require('react');
    React.useEffect(() => { onCancel(); }, [onCancel]);
    return null;
  };
  MockAutoPlay.displayName = 'MockAutoPlayCountdown';
  return { default: MockAutoPlay };
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} style={style} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock RewardedAdGoldButton (uses ThemeProvider)
vi.mock('../results/components/SinglePlayerGoldTopUp', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock utilities
vi.mock('@/utils/guestManager', () => ({
  updateGuestStatsAfterGame: vi.fn(),
  getGuestStats: () => ({ games: 0 }),
  getGuestName: () => 'Guest',
  getGuestSessionId: () => null,
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@/utils/gameLogger', () => ({
  logGameStart: vi.fn().mockResolvedValue(null),
  logGameEnd: vi.fn().mockResolvedValue(null),
  formatWordsForLogging: vi.fn().mockReturnValue([]),
}));

vi.mock('@/utils/gameHistoryManager', () => ({
  addGameToHistory: vi.fn(),
}));

// Mock result components to simplify test rendering
vi.mock('@/components/results/ResultsWinnerBanner', () => {
  const MockResultsWinnerBanner = () => <div data-testid="results-banner">Results Banner</div>;
  MockResultsWinnerBanner.displayName = 'MockResultsWinnerBanner';
  return { default: MockResultsWinnerBanner };
});
vi.mock('@/components/results/Top3Leaderboard', () => {
  const MockTop3Leaderboard = () => <div data-testid="leaderboard">Leaderboard</div>;
  MockTop3Leaderboard.displayName = 'MockTop3Leaderboard';
  return { default: MockTop3Leaderboard };
});
vi.mock('@/components/results/PlayerArchetypeBadge', () => ({ default: () => null }));
vi.mock('@/components/results/PlayerInsights', () => ({ default: () => null }));
vi.mock('@/components/results/CompactResultsStats', () => ({ default: () => null }));
vi.mock('@/components/results/BonusBadgesRow', () => ({ default: () => null }));
vi.mock('@/components/results/CoinRewardDisplay', () => ({ default: () => null }));
vi.mock('@/components/results/BrainPointsDisplay', () => ({ default: () => null }));
vi.mock('@/components/results/RewardsSummary', () => ({ default: () => null }));
vi.mock('@/components/results/MissedWords', () => ({ default: () => null }));
vi.mock('@/components/results/WordPointsGroup', () => ({
  WordPointsGroup: () => null,
  InvalidWordsSection: () => null,
}));
vi.mock('@/components/AchievementBadge', () => ({
  AchievementBadge: () => null,
}));
vi.mock('@/components/layout/MobileTabBar', () => ({
  MobileTabBar: () => null,
}));
vi.mock('@/components/voting/WordFeedbackModal', () => ({ default: () => null }));
vi.mock('@/components/training', () => ({
  TrainingAnalysisModal: () => null,
}));

// Mock new components
vi.mock('../results/components/CelebrationHero', () => ({
  CelebrationHero: () => <div data-testid="celebration-hero">Hero</div>,
}));
vi.mock('../results/components/ResultsInfoCards', () => ({
  ResultsInfoCards: () => <div data-testid="results-info-cards">Cards</div>,
}));

// Mock useResultsData and extracted hooks
vi.mock('../results', () => ({
  useResultsData: () => ({
    allParticipants: [
      { name: 'Player', score: 100, isPlayer: true },
      { name: 'Bot1', score: 80, isPlayer: false },
    ],
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
  useLeaderboardSync: () => ({ globalRank: null, hasSyncedLeaderboard: false }),
  useGameHistory: () => {},
  useGameSessionLogging: () => {},
  useCoinRewards: () => ({ coinReward: null }),
  useWinStreakTracking: () => ({ winStreakData: null }),
  useCognitiveScoring: () => ({ brainPointsReward: null }),
  useSignupPrompt: () => ({ showSignupModal: false, setShowSignupModal: vi.fn() }),
  useSharePromptImpression: () => {},
  useAchievementsSave: () => {},
  useWordValidation: () => ({
    wordValidationQueue: [],
    showWordValidation: false,
    setShowWordValidation: vi.fn(),
    handleWordVote: vi.fn(),
  }),
  useBannerConfig: () => ({
    variant: 'ranking',
    message: undefined,
    announcement: '#1 of 2',
  }),
  // Component exports
  GlobalRankBadge: () => null,
  RankingsSection: () => null,
  LandscapeBanner: () => null,
  LandscapeWordsSection: () => null,
  ScoreDisplay: () => null,
  PerformanceSection: () => null,
  YourWordsSection: () => null,
  AchievementsSection: () => null,
  BotWordsSection: () => null,
  MobileResultsTab: () => null,
  MobileDetailsTab: () => null,
  ChallengeButton: () => null,
}));

describe('SinglePlayerResults NextStep navigation bug', () => {
  const mockOnPlayAgain = vi.fn();
  const mockOnQuickRematch = vi.fn();
  const mockOnBackToLobby = vi.fn();

  const baseResults = {
    playerScore: 100,
    playerWords: ['test'],
    playerWordData: [{ word: 'test', isValid: true, score: 3, timestamp: Date.now(), timeSinceStart: 5 }],
    botScores: [{ name: 'Bot1', score: 80, words: ['word'] }],
    grid: [['T', 'E'], ['S', 'T']],
    gameDuration: 120,
    language: 'en' as const,
    gameSessionId: 'test-session-123',
    allPossibleWords: ['test', 'set', 'tet'],
    isNewHighScore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockClear();
  });

  it('should navigate to /multiplayer when clicking next step prompt in bot game results, NOT trigger quick rematch', async () => {
    const user = userEvent.setup();

    render(
      <SinglePlayerResults
        results={baseResults}
        mode="solo-bots"
        onPlayAgain={mockOnPlayAgain}
        onQuickRematch={mockOnQuickRematch}
        onBackToLobby={mockOnBackToLobby}
      />
    );

    // In desktop variant, the clickable element is the "Let's Go!" button
    const letsGoButtons = screen.getAllByText("Let's Go!");
    await user.click(letsGoButtons[0]);

    // Should navigate to multiplayer, NOT call onQuickRematch
    expect(mockRouterPush).toHaveBeenCalledWith('/en/multiplayer');
    expect(mockOnQuickRematch).not.toHaveBeenCalled();
  });

  it('should not use onPlayAgain or onQuickRematch callbacks (navigation is handled by NextStepPrompt)', async () => {
    const user = userEvent.setup();

    render(
      <SinglePlayerResults
        results={baseResults}
        mode="solo-bots"
        onPlayAgain={mockOnPlayAgain}
        onQuickRematch={mockOnQuickRematch}
        onBackToLobby={mockOnBackToLobby}
      />
    );

    // Click the "Let's Go!" button to navigate
    const letsGoButtons = screen.getAllByText("Let's Go!");
    await user.click(letsGoButtons[0]);

    // After code simplification, SinglePlayerResults no longer uses onPlayAgain or onQuickRematch
    // Navigation is handled by NextStepPrompt component using router.push
    expect(mockOnPlayAgain).not.toHaveBeenCalled();
    expect(mockOnQuickRematch).not.toHaveBeenCalled();
  });

  it('should navigate to /singleplayer?preset=bots when clicking next step in PRACTICE mode results', async () => {
    const user = userEvent.setup();

    render(
      <SinglePlayerResults
        results={{ ...baseResults, botScores: [] }} // Practice mode has no bots
        mode="practice"
        onPlayAgain={mockOnPlayAgain}
        onQuickRematch={mockOnQuickRematch}
        onBackToLobby={mockOnBackToLobby}
      />
    );

    // In practice mode, the next step is "Challenge the Bots!"
    // The clickable element is the "Let's Go!" button
    const letsGoButtons = screen.getAllByText("Let's Go!");
    await user.click(letsGoButtons[0]);

    // Should navigate to singleplayer with bots preset
    expect(mockRouterPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');
    expect(mockOnQuickRematch).not.toHaveBeenCalled();
  });
});
