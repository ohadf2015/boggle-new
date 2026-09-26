import { vi } from 'vitest';
/**
 * useHostGameActions — MP round start has exactly one GO moment: the
 * countdown stage (MpCountdownStage). A success toast reading "GO! You're in!"
 * fired on top of it, repeating the countdown's GO. Neither the Start button
 * nor the from-results restart may toast it.
 */

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
import { neoSuccessToast } from '@/components/NeoToast';

describe('useHostGameActions - no duplicate GO toast at MP round start', () => {
  const mockEmit = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit } as any;
  const noop = vi.fn();
  const setShowSoloConfirm = vi.fn();
  const noopRef = { current: false } as any;
  const timeoutRef = { current: null } as any;

  const baseOptions = {
    socket: mockSocket,
    gameCode: 'GOGO',
    username: 'host',
    t: (key: string) => key,
    difficulty: 'MEDIUM' as const,
    timerValue: 3,
    minWordLength: 2,
    hostPlaying: true,
    gameType: 'regular' as const,
    tournamentRounds: 3,
    roomLanguage: 'en' as const,
    wordsForBoard: [],
    boardTheme: null,
    playersCount: 2,
    tournamentData: null,
    setTableData: noop,
    setRemainingTime: noop,
    setShowStartAnimation: noop,
    setPlayerWordCounts: noop,
    setPlayerScores: noop,
    setHostFoundWords: noop,
    setHostAchievements: noop,
    setTournamentCreating: noop,
    setTournamentData: noop,
    setGameType: noop,
    setFinalScores: noop,
    setGameStarted: noop,
    setShowExitConfirm: noop,
    setShowCancelTournamentDialog: noop,
    setShowQR: noop,
    intentionalExitRef: noopRef,
    setShowSoloConfirm,
    tournamentTimeoutRef: timeoutRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const successToastKeys = () =>
    (neoSuccessToast as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);

  it('does not fire a "GO!" success toast when the host starts a round (the countdown is the GO)', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    act(() => { result.current.startGame(); });

    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeDefined();
    expect(successToastKeys()).not.toContain('common.gameStarted');
    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('does not fire a "GO!" success toast when the host starts the next game from results', () => {
    // resetGame acks success → host immediately emits a fresh startGame.
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (r: unknown) => void) => {
      if (event === 'resetGame' && ack) ack({ success: true, gameState: 'waiting' });
    });
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    act(() => { result.current.handleStartNewGame(); });

    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeDefined();
    expect(successToastKeys()).not.toContain('common.gameStarted');
    mockEmit.mockReset();
  });
});
