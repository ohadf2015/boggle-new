// @vitest-environment jsdom
/** exp-mp-duo-bot-v1: the results controller passes the host's duo-bot request to the next-round start. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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
const nextRoundArgs = vi.fn();
vi.mock('../useMpNextRound', () => ({
  useMpNextRound: (args: unknown) => { nextRoundArgs(args); return { isStartingNextRound: false, handleStartGame: vi.fn() }; },
}));
const duoArgs = vi.fn();
let duoAnswer = false;
vi.mock('../../duoBotRequest', async (orig) => ({
  ...(await orig<typeof import('../../duoBotRequest')>()),
  useDuoBotRequest: (args: unknown) => { duoArgs(args); return duoAnswer; },
}));

vi.mock('@/hooks/useResultsData', () => ({
  useResultsData: () => ({
    sortedScores: [{ username: 'alice', score: 42, wordsFoundCount: 5 }, { username: 'bob', score: 10 }],
    isCurrentUserWinner: true,
    currentPlayerRank: 1,
    currentPlayerData: { username: 'alice', score: 42, wordsFoundCount: 5 },
    currentPlayerValidWords: [{ word: 'hello', score: 8, validated: true }],
    normalizeUsername: (u: string) => u,
    winner: { username: 'alice', score: 42 },
  }),
}));

import { useMpResultsController } from '../useMpResultsController';

const props = (over: Record<string, unknown> = {}) => ({
  finalScores: [{ username: 'alice', score: 42 } as never, { username: 'bob', score: 10 } as never],
  gameCode: 'ABCD', username: 'alice', socket: null, isHost: true, gameDuration: 90,
  ...over,
});

describe('useMpResultsController — exp-mp-duo-bot-v1 wiring', () => {
  beforeEach(() => { nextRoundArgs.mockClear(); duoArgs.mockClear(); duoAnswer = false; });

  it('asks the duo gate about this 2-human public room', () => {
    renderHook(() => useMpResultsController(props() as never));
    expect(duoArgs).toHaveBeenLastCalledWith({ isClassroom: false, isDuo: true });
  });

  it('hands the answer to the next-round start', () => {
    duoAnswer = true;
    renderHook(() => useMpResultsController(props() as never));
    expect(nextRoundArgs).toHaveBeenLastCalledWith(expect.objectContaining({ duoBot: true }));
  });

  it('a classroom room is reported as such (the gate then never asks)', () => {
    renderHook(() => useMpResultsController(props({ classroomSummary: { teacherName: 'T' } }) as never));
    expect(duoArgs).toHaveBeenLastCalledWith(expect.objectContaining({ isClassroom: true }));
  });
});
