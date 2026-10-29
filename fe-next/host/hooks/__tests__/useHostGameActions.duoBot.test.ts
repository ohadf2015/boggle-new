import { vi } from 'vitest';
/** exp-mp-duo-bot-v1: the lobby start path carries the host's duo-bot request. */

vi.mock('socket.io-client');
vi.mock('@/components/NeoToast', () => ({
  neoSuccessToast: vi.fn(),
  neoErrorToast: vi.fn(),
  neoInfoToast: vi.fn(),
  TOAST_ICONS: {},
}));
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));
vi.mock('@/utils/utils', () => ({
  generateRandomTable: vi.fn().mockReturnValue([['A', 'B'], ['C', 'D']]),
}));
vi.mock('@/utils/consts', () => ({
  DIFFICULTIES: {
    EASY: { rows: 4, cols: 4 },
    MEDIUM: { rows: 5, cols: 5 },
    HARD: { rows: 6, cols: 6 },
  },
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));
vi.mock('@/hooks/gameState', () => ({
  useGameMode: vi.fn().mockReturnValue('classic'),
  useHostSelectedGameMode: vi.fn().mockReturnValue('classic'),
}));

import { renderHook, act } from '@testing-library/react';
import { useHostGameActions } from '../useHostGameActions';

describe('useHostGameActions - exp-mp-duo-bot-v1 on the lobby start', () => {
  const mockEmit = vi.fn();
  const noop = vi.fn();
  const base = {
    socket: { connected: true, emit: mockEmit } as any,
    gameCode: 'DUO', username: 'host', t: (key: string) => key,
    difficulty: 'MEDIUM' as const, timerValue: 3, minWordLength: 2, hostPlaying: true,
    gameType: 'regular' as const, tournamentRounds: 3, roomLanguage: 'en' as const,
    wordsForBoard: [], boardTheme: null, playersCount: 2, tournamentData: null,
    setTableData: noop, setRemainingTime: noop, setShowStartAnimation: noop,
    setPlayerWordCounts: noop, setPlayerScores: noop, setHostFoundWords: noop,
    setHostAchievements: noop, setTournamentCreating: noop, setTournamentData: noop,
    setGameType: noop, setFinalScores: noop, setGameStarted: noop, setShowExitConfirm: noop,
    setShowCancelTournamentDialog: noop, setShowQR: noop, setShowSoloConfirm: noop,
    intentionalExitRef: { current: false } as any, tournamentTimeoutRef: { current: null } as any,
  };
  const startPayload = () => mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')?.[1];

  beforeEach(() => vi.clearAllMocks());

  it('Given the host is in the bot arm, When they press Start, Then startGame asks the server for a duo bot', () => {
    const { result } = renderHook(() => useHostGameActions({ ...base, duoBot: true }));
    act(() => { result.current.startGame(); });
    expect(startPayload()).toMatchObject({ duoBot: true });
  });

  it('Given control, When they press Start, Then startGame carries no duoBot', () => {
    const { result } = renderHook(() => useHostGameActions(base));
    act(() => { result.current.startGame(); });
    expect(startPayload()).toBeDefined();
    expect(startPayload()).not.toHaveProperty('duoBot');
  });
});
