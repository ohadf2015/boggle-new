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
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Global store for captured props (accessible by hoisted mocks)
declare global {
  var __TEST_BANNER_PROPS__: { rank?: number; winner?: { username: string; score: number } } | null;
}
globalThis.__TEST_BANNER_PROPS__ = null;

// Mock all heavy dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

jest.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    currentStreak: 0,
    bestStreak: 0,
    recordWin: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('framer-motion', () => ({
  motion: {
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
}));

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock next/dynamic - needs to handle ResultsWinnerBanner specially
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<{ default: React.ComponentType<any> }>, options?: { ssr?: boolean }) => {
    // Check if this is ResultsWinnerBanner based on the import function string
    const importStr = importFn.toString();
    if (importStr.includes('ResultsWinnerBanner')) {
      // Return our mock component that captures props
      const MockBanner = (props: { rank?: number; winner?: { username: string; score: number } }) => {
        globalThis.__TEST_BANNER_PROPS__ = props;
        const React = require('react');
        return React.createElement('div', {
          'data-testid': 'winner-banner',
          'data-rank': props.rank,
        }, `${props.winner?.username} - Rank: ${props.rank}`);
      };
      MockBanner.displayName = 'ResultsWinnerBanner';
      return MockBanner;
    }
    // Return a component that renders nothing for other dynamic imports
    const React = require('react');
    const Component = React.forwardRef((_props: any, _ref: any) => null);
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

jest.mock('@/components/results/ResultsPlayerCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ExitRoomButton', () => ({
  __esModule: true,
  default: () => <button data-testid="exit-button">Exit</button>,
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/auth/FirstWinSignupModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/results/ShareWinPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/voting/WordFeedbackModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false,
    wordToVote: null,
    wordQueue: [],
    xpGainedData: null,
    levelUpData: null,
    showLevelUpCelebration: false,
    setShowLevelUpCelebration: jest.fn(),
    nearMisses: [],
    mysteryReward: null,
    showMysteryReward: false,
    referralMilestone: null,
    showReferralMilestone: false,
    readyUsernames: [],
    isCurrentPlayerReady: false,
    handleVote: jest.fn(),
    handleFeedbackSkip: jest.fn(),
    handleMysteryRewardClose: jest.fn(),
    handleReferralMilestoneClose: jest.fn(),
    handleMarkReady: jest.fn(),
  }),
}));

jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: jest.fn(),
}));

jest.mock('@/utils/guestManager', () => ({
  shouldShowUpgradePrompt: jest.fn(() => false),
  getGuestStatsSummary: jest.fn(() => ({ gamesPlayed: 5 })),
  updateGuestStatsAfterGame: jest.fn(),
  isFirstWin: jest.fn(() => false),
}));

jest.mock('@/utils/growthTracking', () => ({
  trackGameCompletion: jest.fn(),
  trackStreakMilestone: jest.fn(),
}));

jest.mock('@/utils/gameHistoryManager', () => ({
  addGameToHistory: jest.fn(),
}));

jest.mock('@/utils/coinManager', () => ({
  awardGameCoins: jest.fn(() => null),
}));

jest.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({
    saveCognitiveScore: jest.fn().mockResolvedValue(null),
    isSaving: false,
  }),
}));

jest.mock('@/hooks/useFirstWinCelebration', () => ({
  useFirstWinCelebration: jest.fn(),
}));

jest.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: jest.fn(),
}));

jest.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    refreshCoins: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase', () => ({
  syncCoinsToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
    isConnected: true,
  }),
}));

jest.mock('@/components/RoomChat', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/CrazyGamesBanner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/CrazyGamesSDK', () => ({
  shouldHideExternalLogin: jest.fn(() => false),
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: jest.fn(),
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
    onReturnToRoom: jest.fn(),
    socket: { emit: jest.fn(), on: jest.fn(), off: jest.fn() } as any,
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
    jest.clearAllMocks();
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

      // The winner banner should show rank 1 for the winning player
      expect(globalThis.__TEST_BANNER_PROPS__?.rank).toBe(1);
      expect(globalThis.__TEST_BANNER_PROPS__?.winner?.username).toBe('PlayerOne');
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

      expect(globalThis.__TEST_BANNER_PROPS__?.rank).toBe(2);
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
      // BUG: Currently shows rank 4 because username doesn't match
      expect(globalThis.__TEST_BANNER_PROPS__?.rank).toBe(1);
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
      // BUG: Currently shows rank 4 because username doesn't match (case sensitive)
      expect(globalThis.__TEST_BANNER_PROPS__?.rank).toBe(1);
    });

    it('should NOT show rank 4 for first place winner with zero score (expected behavior)', () => {
      // This is the CORRECT behavior - when a player has zero score,
      // they should show rank 4+ (better luck next time) even if "first"
      const finalScores = [
        { username: 'ZeroScorePlayer', score: 0, allWords: [] },
        { username: 'OtherPlayer', score: 0, allWords: [] },
      ];

      renderResultsPage({
        finalScores,
        username: 'ZeroScorePlayer',
      });

      // Zero score players should show rank 4 (encouraging purple banner)
      expect(globalThis.__TEST_BANNER_PROPS__?.rank).toBe(4);
    });
  });
});
