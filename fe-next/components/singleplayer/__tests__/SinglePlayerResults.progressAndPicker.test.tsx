/**
 * SinglePlayerResults — progress card, next-game picker, interstitial on exit.
 *
 * New players land in single player with no mode picker; the results screen
 * must (a) show progress every game, (b) offer the next game in-page, and
 * (c) only interrupt with an interstitial at the TRANSITION the player
 * chooses, never over the score reveal.
 */
import React from 'react';
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const { showInterstitial } = vi.hoisted(() => ({ showInterstitial: vi.fn(async () => {}) }));
vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial }),
  default: () => ({ showInterstitial }),
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


describe('SinglePlayerResults — progress, picker, interstitial-on-exit', () => {
  const onPlayAgain = vi.fn();
  const onBackToLobby = vi.fn();
  const onStartPreset = vi.fn();

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

  function renderResults() {
    return render(
      <SinglePlayerResults
        results={baseResults as any}
        mode="solo-bots"
        difficulty="EASY"
        onPlayAgain={onPlayAgain}
        onBackToLobby={onBackToLobby}
        onStartPreset={onStartPreset}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('Given results mount, When first painted, Then NO interstitial fires over the score reveal', () => {
    renderResults();
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('Given the player heads back to the lobby, When tapped, Then the interstitial runs first and the exit follows', async () => {
    const user = userEvent.setup();
    renderResults();
    const backButtons = screen.getAllByText('Back to Lobby');
    await user.click(backButtons[0]);
    expect(showInterstitial).toHaveBeenCalledWith('singleplayer-complete');
    await waitFor(() => expect(onBackToLobby).toHaveBeenCalledTimes(1));
    // Order: ad first, exit second.
    expect(showInterstitial.mock.invocationCallOrder[0]).toBeLessThan(onBackToLobby.mock.invocationCallOrder[0]);
  });

  it('Given the next-step CTA, When tapped, Then the interstitial runs before navigation', async () => {
    const user = userEvent.setup();
    renderResults();
    // The clickable element in the in-flow card is the "Let's Go!" button.
    const cta = screen.getAllByText("Let's Go!")[0];
    await user.click(cta);
    expect(showInterstitial).toHaveBeenCalledWith('singleplayer-complete');
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/en/multiplayer'));
  });

  it('Given results, When rendered, Then the progress pulse shows game #1 as the first game on this device', () => {
    renderResults();
    const pulse = screen.getAllByTestId('progress-pulse')[0];
    expect(pulse).toBeInTheDocument();
    expect(pulse).toHaveTextContent('results.progressPulse.game');
    expect(screen.queryByTestId('progress-delta')).toBeNull();
  });

  it('Given a solo-bots win, When rendered, Then the next-game picker offers a harder rematch that starts in-page', async () => {
    const user = userEvent.setup();
    renderResults();
    const harder = screen.getAllByTestId('next-game-rematch-harder')[0];
    await user.click(harder);
    expect(onStartPreset).toHaveBeenCalledWith('competitive');
    // The in-page rematch is also a transition — the interstitial runs first.
    expect(showInterstitial).toHaveBeenCalledWith('singleplayer-complete');
  });

  it('Given no onStartPreset (older callers), When rendered, Then the picker is simply absent', () => {
    render(
      <SinglePlayerResults results={baseResults as any} mode="solo-bots" onPlayAgain={onPlayAgain} onBackToLobby={onBackToLobby} />
    );
    expect(screen.queryByTestId('next-game-rematch-harder')).toBeNull();
  });
});
