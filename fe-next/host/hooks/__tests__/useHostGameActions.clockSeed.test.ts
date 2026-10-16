import { vi } from 'vitest';

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

describe("useHostGameActions — the round clock is seeded by the server start, never by the click", () => {
  const mockEmit = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit } as any;
  const noop = vi.fn();
  const setShowSoloConfirm = vi.fn();
  const setRemainingTime = vi.fn();
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
    setRemainingTime,
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

  it('GIVEN the host taps Start WHEN the server has not broadcast the start yet THEN the clock is cleared, not seeded with the full round', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));
    act(() => { result.current.startGame(); });
    expect(setRemainingTime).toHaveBeenCalledWith(null);
    expect(setRemainingTime).not.toHaveBeenCalledWith(180);
  });

  it('GIVEN the host restarts from results WHEN the new start is emitted THEN the leftover time from last round is cleared too', () => {
    mockEmit.mockImplementation((event: string, _payload: unknown, ack?: (r: unknown) => void) => {
      if (event === 'resetGame' && ack) ack({ success: true, gameState: 'waiting' });
    });
    const { result } = renderHook(() => useHostGameActions(baseOptions));
    act(() => { result.current.handleStartNewGame(); });
    expect(setRemainingTime).toHaveBeenCalledWith(null);
    expect(setRemainingTime).not.toHaveBeenCalledWith(180);
    mockEmit.mockReset();
  });
});
