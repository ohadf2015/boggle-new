/**
 * ResultsPage Ranking Tests
 *
 * Tests for player placement/ranking calculation and display
 *
 * Bug: In multiplayer, a player who finished 1st was shown as 4th place.
 * Root cause: Username mismatch between the `username` prop and the
 * `username` field in `finalScores` array.
 *
 * The ranking calculation finds the player's position using:
 *   sortedScores.findIndex(p => p.username === username)
 *
 * If the username prop doesn't match exactly (case, whitespace, etc.),
 * findIndex returns -1, and the player shows as rank 4+ ("better luck next time").
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Global store for captured props (accessible by hoisted mocks)
declare global {
  var __TEST_BANNER_PROPS__: { rank?: number; winner?: { username: string; score: number } } | null;
  var __TEST_MAIN_CONTENT_PROPS__: { currentPlayerRank?: number; username?: string } | null;
}
globalThis.__TEST_BANNER_PROPS__ = null;
globalThis.__TEST_MAIN_CONTENT_PROPS__ = null;

// Mock all heavy dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    currentStreak: 0,
    bestStreak: 0,
    recordWin: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('framer-motion', () => {
  const motionValueStub = () => ({
    set: vi.fn(),
    get: () => 0,
    on: () => () => {},
    onChange: () => () => {},
  });
  return {
    m: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...props}>{children}</div>
      ),
      button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <button {...props}>{children}</button>
      ),
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...props}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
    useScroll: () => ({
      scrollX: motionValueStub(),
      scrollY: motionValueStub(),
      scrollXProgress: motionValueStub(),
      scrollYProgress: motionValueStub(),
    }),
    useTransform: () => motionValueStub(),
    useMotionValue: motionValueStub,
    useVelocity: () => motionValueStub(),
    useSpring: () => motionValueStub(),
  };
});

vi.mock('canvas-confetti', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock next/dynamic - return null components for all dynamic imports
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const React = require('react');
    const Component = React.forwardRef((_props: any, _ref: any) => null);
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock ResultsMainContent to capture currentPlayerRank
vi.mock('@/components/results/ResultsMainContent', () => ({
  __esModule: true,
  ResultsMainContent: (props: any) => {
    globalThis.__TEST_MAIN_CONTENT_PROPS__ = {
      currentPlayerRank: props.currentPlayerRank,
      username: props.username,
    };
    const React = require('react');
    return React.createElement('div', {
      'data-testid': 'results-main-content',
      'data-rank': props.currentPlayerRank,
    });
  },
}));

vi.mock('@/components/results/ResultsPlayerCard', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ExitRoomButton', () => ({
  __esModule: true,
  default: () => <button data-testid="exit-button">Exit</button>,
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/auth/FirstWinSignupModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/results/ShareWinPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/voting/WordFeedbackModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false,
    wordToVote: null,
    wordQueue: [],
    xpGainedData: null,
    levelUpData: null,
    showLevelUpCelebration: false,
    setShowLevelUpCelebration: vi.fn(),
    nearMisses: [],
    referralMilestone: null,
    showReferralMilestone: false,
    readyUsernames: [],
    isCurrentPlayerReady: false,
    handleVote: vi.fn(),
    handleFeedbackSkip: vi.fn(),
    handleReferralMilestoneClose: vi.fn(),
    handleMarkReady: vi.fn(),
  }),
}));

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

vi.mock('@/utils/guestManager', () => ({
  shouldShowUpgradePrompt: vi.fn(() => false),
  getGuestStatsSummary: vi.fn(() => ({ gamesPlayed: 5 })),
  getGuestStats: vi.fn(() => ({ games: 5, words: 0, score: 0 })),
  updateGuestStatsAfterGame: vi.fn(),
  isFirstWin: vi.fn(() => false),
}));

vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: vi.fn(() => 'after-2nd-game'),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGameCompletion: vi.fn(),
  trackStreakMilestone: vi.fn(),
}));

vi.mock('@/utils/gameHistoryManager', () => ({
  addGameToHistory: vi.fn(),
}));

vi.mock('@/utils/coinManager', () => ({
  awardGameCoins: vi.fn(() => null),
}));

vi.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({
    saveCognitiveScore: vi.fn().mockResolvedValue(null),
    isSaving: false,
  }),
}));

vi.mock('@/hooks/useFirstWinCelebration', () => ({
  useFirstWinCelebration: vi.fn(),
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: vi.fn(),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    refreshCoins: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  syncCoinsToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    isConnected: true,
  }),
  useSocketOptional: () => null,
}));

vi.mock('@/components/RoomChat', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/CrazyGamesBanner', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  shouldHideExternalLogin: vi.fn(() => false),
  useCrazyGames: vi.fn(() => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showMidgameAd: vi.fn(),
    showRewardedAd: vi.fn(),
    hasAdblock: vi.fn(async () => false),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    submitLeaderboardScore: vi.fn(),
  })),
}));

// Skip the pre-result fanfare overlay: for a notable rank the real page returns
// only <PreResultFanfare> and never mounts the results tree until onComplete
// fires (auto-dismisses via reduced-motion in real UX, but not in jsdom). These
// tests assert the underlying rank/banner tree, so collapse the gate to null.
vi.mock('@/components/mascot/celebrationKind', () => ({
  pickCelebrationKind: vi.fn(() => null),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Import after all mocks are set up
import ResultsPage from '@/components/views/ResultsPage';

// Helper to render ResultsPage with required providers
const renderResultsPage = (props: {
  finalScores: Array<{ username: string; score: number; allWords?: any[]; avatar?: any }>;
  username: string;
  gameCode?: string;
  onReturnToRoom?: () => void;
  socket?: any;
}) => {
  const defaultProps = {
    gameCode: 'TEST123',
    onReturnToRoom: vi.fn(),
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
    duplicateRuleDisabled: false,
    playerCount: 2,
    isHost: false,
    roomLanguage: 'en' as const,
  };

  return render(
    <NavigationProvider>
      <LanguageProvider>
        <ResultsPage {...defaultProps} {...props} />
      </LanguageProvider>
    </NavigationProvider>
  );
};

describe('ResultsPage Ranking', () => {
  beforeEach(() => {
    globalThis.__TEST_BANNER_PROPS__ = null;
    globalThis.__TEST_MAIN_CONTENT_PROPS__ = null;
    vi.clearAllMocks();
  });

  describe('Player rank calculation', () => {
    it('should show rank 1 when player has highest score and username matches exactly', () => {
      const finalScores = [
        { username: 'PlayerOne', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'PlayerTwo', score: 50, allWords: [] },
      ];

      renderResultsPage({
        finalScores,
        username: 'PlayerOne', // Exact match
      });

      // The main content should receive rank 1 for the winning player
      expect(globalThis.__TEST_MAIN_CONTENT_PROPS__?.currentPlayerRank).toBe(1);
    });

    it('should show rank 2 when player has second highest score', () => {
      const finalScores = [
        { username: 'Winner', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'Runner', score: 50, allWords: [{ word: 'cat', score: 2, validated: true }] },
      ];

      renderResultsPage({
        finalScores,
        username: 'Runner',
      });

      expect(globalThis.__TEST_MAIN_CONTENT_PROPS__?.currentPlayerRank).toBe(2);
    });

    /**
     * BUG: This test documents the username mismatch bug.
     *
     * When a player joins a room, the frontend username state may differ
     * from what the server stores (e.g., trimming, normalization).
     *
     * The player finishes first but sees "4th place" because:
     * - username prop = "PlayerOne " (with trailing space)
     * - finalScores[0].username = "PlayerOne" (trimmed by server)
     * - findIndex returns -1 (no match)
     * - bannerRank defaults to 4 for "not found" case
     */
    it('should show rank 1 even when username has trailing whitespace (bug fix)', () => {
      const finalScores = [
        { username: 'PlayerOne', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'PlayerTwo', score: 50, allWords: [] },
      ];

      renderResultsPage({
        finalScores,
        username: 'PlayerOne ', // Trailing space - mismatch!
      });

      // EXPECTED: rank should be 1 (player with highest score)
      // Username normalization (trim) ensures match despite trailing space
      expect(globalThis.__TEST_MAIN_CONTENT_PROPS__?.currentPlayerRank).toBe(1);
    });

    it('should show rank 1 even when username case differs (bug fix)', () => {
      const finalScores = [
        { username: 'PlayerOne', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'PlayerTwo', score: 50, allWords: [] },
      ];

      renderResultsPage({
        finalScores,
        username: 'playerone', // Different case - mismatch!
      });

      // EXPECTED: rank should be 1 (player with highest score)
      // Username normalization (lowercase) ensures match despite case difference
      expect(globalThis.__TEST_MAIN_CONTENT_PROPS__?.currentPlayerRank).toBe(1);
    });

    it('should show rank 1 for zero-score player listed first in multiplayer', () => {
      // When both players have zero score, sort is stable so first player stays first.
      // currentPlayerRank reflects the raw position (1-based).
      const finalScores = [
        { username: 'ZeroScorePlayer', score: 0, allWords: [] },
        { username: 'OtherPlayer', score: 0, allWords: [] },
      ];

      renderResultsPage({
        finalScores,
        username: 'ZeroScorePlayer',
      });

      // ZeroScorePlayer is first in the sorted list (stable sort, both score 0)
      expect(globalThis.__TEST_MAIN_CONTENT_PROPS__?.currentPlayerRank).toBe(1);
    });
  });
});
