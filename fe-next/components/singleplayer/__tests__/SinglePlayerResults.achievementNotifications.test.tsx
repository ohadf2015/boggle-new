/**
 * SinglePlayerResults Achievement Notifications Tests
 *
 * Tests that achievement notifications are displayed in single player
 * using the same UnifiedAchievementModal as multiplayer.
 *
 * This ensures alignment between single player and multiplayer achievement notifications.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
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
        'achievements.unlocked': 'Achievement Unlocked!',
        'achievements.upgraded': 'Achievement Upgraded!',
        'achievements.FIRST_BLOOD.name': 'First Blood',
        'achievements.FIRST_BLOOD.description': 'Find your first word',
        'achievements.WORD_MASTER.name': 'Word Master',
        'achievements.WORD_MASTER.description': 'Find a 7+ letter word',
        'common.continue': 'Continue',
        'common.you': 'You',
        'common.score': 'Score',
        'common.words': 'Words',
        'hostView.achievements': 'Achievements',
        'singlePlayer.achievementsNotSaved': 'Achievements not saved',
        'nextStep.backToLobby': 'Back to Lobby',
        'results.results': 'Results',
        'results.details': 'Details',
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

// Mock SoundEffectsContext
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: jest.fn(),
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
    h2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    h3: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className={className} {...props}>{children}</h3>
    ),
    p: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className} {...props}>{children}</p>
    ),
    button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button onClick={onClick} className={className} {...props}>{children}</button>
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
  AchievementBadge: ({ achievement }: { achievement: { key: string } }) => (
    <div data-testid="achievement-badge">{achievement.key}</div>
  ),
}));
jest.mock('@/components/layout/MobileTabBar', () => ({
  MobileTabBar: () => null,
}));
jest.mock('@/components/voting/WordFeedbackModal', () => () => null);
jest.mock('@/components/training', () => ({
  TrainingAnalysisModal: () => null,
}));

// Mock new components
jest.mock('../results/components/CelebrationHero', () => ({
  CelebrationHero: () => <div data-testid="celebration-hero">Hero</div>,
}));
jest.mock('../results/components/ResultsInfoCards', () => ({
  ResultsInfoCards: () => <div data-testid="results-info-cards">Cards</div>,
}));

// Mock useResultsData and extracted hooks
jest.mock('../results', () => ({
  useResultsData: () => ({
    allParticipants: [
      { name: 'Player', score: 100, isPlayer: true },
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
    announcement: '#1',
  }),
  // Component exports
  GlobalRankBadge: () => null,
  RankingsSection: () => null,
  LandscapeBanner: () => null,
  LandscapeWordsSection: () => null,
  ScoreDisplay: () => null,
  PerformanceSection: () => null,
  YourWordsSection: () => null,
  AchievementsSection: ({ achievements }: { achievements: Array<{ key: string }> }) => (
    <div data-testid="achievements-section">
      {achievements.map(a => <div key={a.key} data-testid="achievement-badge">{a.key}</div>)}
    </div>
  ),
  BotWordsSection: () => null,
  MobileResultsTab: () => null,
  MobileDetailsTab: () => null,
  ChallengeButton: () => null,
}));

// Import after mocks
import SinglePlayerResults from '../SinglePlayerResults';
import type { SinglePlayerResultsData } from '../SinglePlayerView';

const createMockResults = (achievements: Array<{ key: string; icon: string }> = []): SinglePlayerResultsData => ({
  playerScore: 100,
  playerWords: ['test', 'word'],
  playerWordData: [
    { word: 'test', score: 10, timestamp: 1000, timeSinceStart: 1, isValid: true },
    { word: 'word', score: 10, timestamp: 2000, timeSinceStart: 2, isValid: true },
  ],
  gameDuration: 180,
  botScores: [],
  grid: [['T', 'E', 'S', 'T'], ['W', 'O', 'R', 'D'], ['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H']],
  allPossibleWords: ['test', 'word'],
  isNewHighScore: false,
  achievements,
});

describe('SinglePlayerResults - Achievement Notifications', () => {
  const defaultProps = {
    mode: 'solo-bots' as const,
    onPlayAgain: jest.fn(),
    onBackToLobby: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should display UnifiedAchievementModal when achievements are present', async () => {
    const achievements = [
      { key: 'FIRST_BLOOD', icon: '🎯' },
    ];

    render(
      <SinglePlayerResults
        results={createMockResults(achievements)}
        {...defaultProps}
      />
    );

    // The modal should appear for the first achievement
    await waitFor(() => {
      expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
    });

    // Should show "Achievement Unlocked!" text
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
  });

  it('should auto-dismiss achievement modal after 3 seconds', async () => {
    const achievements = [
      { key: 'FIRST_BLOOD', icon: '🎯' },
    ];

    render(
      <SinglePlayerResults
        results={createMockResults(achievements)}
        {...defaultProps}
      />
    );

    // Modal should be visible initially
    await waitFor(() => {
      expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
    });

    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Modal should be dismissed
    await waitFor(() => {
      expect(screen.queryByTestId('unified-achievement-modal')).not.toBeInTheDocument();
    });
  });

  it('should queue multiple achievements and show them sequentially', async () => {
    const achievements = [
      { key: 'FIRST_BLOOD', icon: '🎯' },
      { key: 'WORD_MASTER', icon: '📚' },
    ];

    render(
      <SinglePlayerResults
        results={createMockResults(achievements)}
        {...defaultProps}
      />
    );

    // First achievement modal should appear
    await waitFor(() => {
      expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
    });
    expect(screen.getByText('First Blood')).toBeInTheDocument();

    // Dismiss first modal (auto-dismiss after 3s)
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // After 500ms delay, second achievement should appear
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Second achievement should be displayed
    await waitFor(() => {
      expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
    });
    expect(screen.getByText('Word Master')).toBeInTheDocument();
  });

  it('should not show modal when there are no achievements', () => {
    render(
      <SinglePlayerResults
        results={createMockResults([])}
        {...defaultProps}
      />
    );

    // No modal should be present
    expect(screen.queryByTestId('unified-achievement-modal')).not.toBeInTheDocument();
  });

  it('should allow dismissing modal by clicking Continue button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const achievements = [
      { key: 'FIRST_BLOOD', icon: '🎯' },
    ];

    render(
      <SinglePlayerResults
        results={createMockResults(achievements)}
        {...defaultProps}
      />
    );

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
    });

    // Click Continue button
    const continueButton = screen.getByText('Continue');
    await user.click(continueButton);

    // Modal should be dismissed
    await waitFor(() => {
      expect(screen.queryByTestId('unified-achievement-modal')).not.toBeInTheDocument();
    });
  });
});
