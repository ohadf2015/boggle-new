import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SinglePlayerResults from '../SinglePlayerResults';

// Track navigation
const mockRouterPush = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock session utility
jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: jest.fn(),
}));

// Mock dynamic imports
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => null;
  return MockComponent;
});

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
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
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    profile: null,
    updateProfile: jest.fn(),
    loading: false,
  }),
}));

// Mock CoinContext
jest.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardGameCompletion: jest.fn().mockResolvedValue(null),
  }),
}));

// Mock hooks
jest.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    currentStreak: 0,
    bestStreak: 0,
    lastWinDate: null,
    recordWin: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useAutoShowWithInteraction', () => ({
  useAutoShowWithInteraction: jest.fn(),
}));

jest.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({
    saveCognitiveScore: jest.fn().mockResolvedValue(null),
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock utilities
jest.mock('@/utils/guestManager', () => ({
  updateGuestStatsAfterGame: jest.fn(),
  getGuestStats: () => ({ games: 0 }),
  getGuestName: () => 'Guest',
  getGuestSessionId: () => null,
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

jest.mock('@/utils/gameLogger', () => ({
  logGameStart: jest.fn().mockResolvedValue(null),
  logGameEnd: jest.fn().mockResolvedValue(null),
  formatWordsForLogging: jest.fn().mockReturnValue([]),
}));

jest.mock('@/utils/gameHistoryManager', () => ({
  addGameToHistory: jest.fn(),
}));

// Mock result components to simplify test rendering
jest.mock('@/components/results/ResultsWinnerBanner', () => {
  const MockResultsWinnerBanner = () => <div data-testid="results-banner">Results Banner</div>;
  MockResultsWinnerBanner.displayName = 'MockResultsWinnerBanner';
  return MockResultsWinnerBanner;
});
jest.mock('@/components/results/Top3Leaderboard', () => {
  const MockTop3Leaderboard = () => <div data-testid="leaderboard">Leaderboard</div>;
  MockTop3Leaderboard.displayName = 'MockTop3Leaderboard';
  return MockTop3Leaderboard;
});
jest.mock('@/components/results/PlayerArchetypeBadge', () => () => null);
jest.mock('@/components/results/PlayerInsights', () => () => null);
jest.mock('@/components/results/CompactResultsStats', () => () => null);
jest.mock('@/components/results/BonusBadgesRow', () => () => null);
jest.mock('@/components/results/CoinRewardDisplay', () => () => null);
jest.mock('@/components/results/BrainPointsDisplay', () => () => null);
jest.mock('@/components/results/RewardsSummary', () => () => null);
jest.mock('@/components/results/MissedWords', () => () => null);
jest.mock('@/components/results/WordPointsGroup', () => ({
  WordPointsGroup: () => null,
  InvalidWordsSection: () => null,
}));
jest.mock('@/components/AchievementBadge', () => ({
  AchievementBadge: () => null,
}));
jest.mock('@/components/layout/MobileTabBar', () => ({
  MobileTabBar: () => null,
}));
jest.mock('@/components/voting/WordFeedbackModal', () => () => null);
jest.mock('@/components/training', () => ({
  TrainingAnalysisModal: () => null,
}));

// Mock useResultsData and extracted hooks
jest.mock('../results', () => ({
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
  useSignupPrompt: () => ({ showSignupModal: false, setShowSignupModal: jest.fn() }),
  useAchievementsSave: () => {},
  useWordValidation: () => ({
    wordValidationQueue: [],
    showWordValidation: false,
    setShowWordValidation: jest.fn(),
    handleWordVote: jest.fn(),
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
}));

describe('SinglePlayerResults NextStep navigation bug', () => {
  const mockOnPlayAgain = jest.fn();
  const mockOnQuickRematch = jest.fn();
  const mockOnBackToLobby = jest.fn();

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
    jest.clearAllMocks();
    mockRouterPush.mockClear();
  });

  it('should navigate to /daily when clicking next step prompt in bot game results, NOT trigger quick rematch', async () => {
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

    // In desktop variant, "Try Daily Challenge" is a non-interactive h3 text
    // The clickable element is the "Let's Go!" button
    const letsGoButtons = screen.getAllByText("Let's Go!");
    await user.click(letsGoButtons[0]);

    // Should navigate to daily challenge, NOT call onQuickRematch
    expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
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
