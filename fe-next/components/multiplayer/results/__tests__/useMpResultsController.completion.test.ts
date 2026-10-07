// @vitest-environment jsdom
/**
 * t_d96d8d58: every MP participant who hits Results must get trackGameEnd
 * (first_game_played then game_completed). HostView/PlayerView often unmount
 * before useGameEndTelemetry sees the rising edge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const trackGameEnd = vi.fn();
const recordMpGame = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

vi.mock('@/hooks/useMultiplayerSignupNudge', () => ({
  useMultiplayerSignupNudge: () => ({
    activeNudge: null,
    stats: { mpGamesThisSession: 0, totalWords: 0, totalScore: 0, totalGames: 0 },
    dismissNudge: vi.fn(),
    recordMpGame: (...args: unknown[]) => recordMpGame(...args),
    shouldPulseCoins: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));
vi.mock('@/hooks/useIsGuest', () => ({ useIsGuest: () => true }));
vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({ showWordFeedback: false }),
}));
vi.mock('@/hooks/useResultsSideEffects', () => ({
  useResultsSideEffects: () => ({}),
}));
vi.mock('@/hooks/useQuickReactions', () => ({
  useQuickReactions: () => ({}),
}));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: () => undefined,
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));
vi.mock('@/hooks/useFirstWinCelebration', () => ({
  useFirstWinCelebration: () => undefined,
}));
vi.mock('@/hooks/useGameKeyboardShortcuts', () => ({
  useGameKeyboardShortcuts: () => undefined,
}));
vi.mock('@/hooks/useMpExit', () => ({
  useMpExit: () => vi.fn(),
}));
vi.mock('@/hooks/useLobbyAdGate', () => ({
  useLobbyAdGate: () => ({ showAd: false }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestStatsSummary: () => ({ gamesPlayed: 1 }),
}));
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
  useGameModeConfirmed: () => true,
  useHostSelectedGameMode: () => 'classic',
  useGameActions: () => ({}),
}));
vi.mock('@/lib/results/shouldShowDailyInvite', () => ({
  shouldShowDailyInvite: () => false,
}));
vi.mock('../useMpNextRound', () => ({
  useMpNextRound: () => ({ isStartingNextRound: false }),
}));

vi.mock('@/hooks/useResultsData', () => ({
  useResultsData: () => ({
    sortedScores: [{ username: 'alice', score: 42, wordsFoundCount: 5 }],
    isCurrentUserWinner: true,
    currentPlayerRank: 1,
    currentPlayerData: { username: 'alice', score: 42, wordsFoundCount: 5 },
    currentPlayerValidWords: [{ word: 'hello', score: 8, validated: true }],
    normalizeUsername: (u: string) => u,
    winner: { username: 'alice', score: 42 },
  }),
}));

import { useMpResultsController } from '../useMpResultsController';

describe('useMpResultsController — MP completion emit (t_d96d8d58)', () => {
  beforeEach(() => {
    trackGameEnd.mockClear();
    recordMpGame.mockClear();
  });

  it('calls trackGameEnd once with MP extras and roundId when results mount', async () => {
    renderHook(() =>
      useMpResultsController({
        finalScores: [{ username: 'alice', score: 42, wordsFoundCount: 5 } as never],
        gameCode: 'ABCD',
        username: 'alice',
        socket: null,
        isHost: false,
        gameDuration: 90,
        gameSessionId: 777,
        seriesRoundNumber: 1,
      }),
    );

    await waitFor(() => expect(recordMpGame).toHaveBeenCalledWith('classic'));
    await waitFor(() => expect(trackGameEnd).toHaveBeenCalledTimes(1));

    const [mode, score, wordCount, completed, duration, extras] = trackGameEnd.mock.calls[0];
    expect(mode).toBe('classic');
    expect(score).toBe(42);
    expect(wordCount).toBe(5);
    expect(completed).toBe(true);
    expect(duration).toBe(90);
    expect(extras).toMatchObject({
      isMultiplayer: true,
      engineMode: 'multiplayer',
      role: 'player',
      gameCode: 'ABCD',
      roundId: 'mp:777',
      isWinner: true,
    });
  });
});
