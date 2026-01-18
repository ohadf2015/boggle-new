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

// Mock useResultsData
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

  it('should navigate to /daily when clicking "Try Daily Challenge" in bot game results, NOT trigger quick rematch', async () => {
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

    // Find the "Try Daily Challenge" button in mobile view
    // There are multiple elements with this text (mobile and desktop), get the first (mobile)
    const dailyChallengeButtons = screen.getAllByText('Try Daily Challenge');
    await user.click(dailyChallengeButtons[0]);

    // BUG: Currently this incorrectly calls onQuickRematch instead of navigating to /daily
    // The fix should make it navigate to /en/daily
    expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    expect(mockOnQuickRematch).not.toHaveBeenCalled();
  });

  it('should NOT call onQuickRematch when clicking the next step prompt to try daily challenge', async () => {
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

    // Click "Let's Go!" button which should navigate to daily challenge
    // There are multiple (mobile and desktop views), get the first
    const letsGoButtons = screen.getAllByText("Let's Go!");
    await user.click(letsGoButtons[0]);

    // BUG: Currently this calls onQuickRematch
    // After fix: should navigate and NOT call onQuickRematch
    expect(mockOnQuickRematch).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
  });
});
