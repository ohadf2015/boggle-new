/**
 * useHostGameActions - Game Mode Tests
 * Tests that handleStartNewGame (Play Again) emits gameMode to server.
 */

// Mock dependencies used by the hook
jest.mock('socket.io-client');
jest.mock('@/components/NeoToast', () => ({
  neoSuccessToast: jest.fn(),
  neoErrorToast: jest.fn(),
  neoInfoToast: jest.fn(),
}));
jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: jest.fn(),
}));
jest.mock('@/utils/utils', () => ({
  generateRandomTable: jest.fn().mockReturnValue([['A', 'B'], ['C', 'D']]),
}));
jest.mock('@/utils/consts', () => ({
  DIFFICULTIES: {
    EASY: { rows: 4, cols: 4 },
    MEDIUM: { rows: 5, cols: 5 },
    HARD: { rows: 6, cols: 6 },
  },
}));
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));
jest.mock('@/hooks/gameState', () => ({
  useGameMode: jest.fn().mockReturnValue('blast'),
}));

import { renderHook, act } from '@testing-library/react';
import { useHostGameActions } from '../useHostGameActions';

describe('useHostGameActions - gameMode in handleStartNewGame', () => {
  const mockEmit = jest.fn();
  const mockSocket = {
    connected: true,
    emit: mockEmit,
  } as any;

  const noop = jest.fn();
  const noopRef = { current: false } as any;
  const timeoutRef = { current: null } as any;

  const baseOptions = {
    socket: mockSocket,
    gameCode: 'TEST',
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
    setShowSoloConfirm: noop,
    tournamentTimeoutRef: timeoutRef,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Make resetGame callback invoke immediately with success
    mockEmit.mockImplementation((event: string, _data: any, callback?: any) => {
      if (event === 'resetGame' && typeof callback === 'function') {
        callback({ success: true, gameState: 'waiting' });
      }
    });
  });

  it('should include gameMode in handleStartNewGame emit', () => {
    // GIVEN: hook is rendered with gameMode = 'blast' (from mock)
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN: handleStartNewGame is called (Play Again)
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN: the second emit (startGame) should include gameMode
    const startGameCall = mockEmit.mock.calls.find(
      (call: any[]) => call[0] === 'startGame'
    );
    expect(startGameCall).toBeDefined();
    expect(startGameCall![1]).toEqual(
      expect.objectContaining({ gameMode: 'blast' })
    );
  });

  it('should default gameMode to random when undefined', () => {
    // GIVEN: useGameMode returns undefined (mocked)
    const { useGameMode } = require('@/hooks/gameState');
    (useGameMode as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN
    const startGameCall = mockEmit.mock.calls.find(
      (call: any[]) => call[0] === 'startGame'
    );
    expect(startGameCall).toBeDefined();
    expect(startGameCall![1]).toEqual(
      expect.objectContaining({ gameMode: 'random' })
    );
  });

  it('should force 6x6 grid when gameMode is blast (startGame)', () => {
    // GIVEN: gameMode is blast (already mocked as blast at top)
    const { useGameMode } = require('@/hooks/gameState');
    (useGameMode as jest.Mock).mockReturnValue('blast');
    const { generateRandomTable } = require('@/utils/utils');

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN: startGame is called directly (regular game flow)
    act(() => {
      result.current.startGame();
    });

    // THEN: generateRandomTable should be called with 6x6 (not 5x5 from MEDIUM difficulty)
    expect(generateRandomTable).toHaveBeenCalledWith(6, 6, 'en', []);
  });

  it('should force 6x6 grid when gameMode is blast (handleStartNewGame)', () => {
    // GIVEN
    const { useGameMode } = require('@/hooks/gameState');
    (useGameMode as jest.Mock).mockReturnValue('blast');
    const { generateRandomTable } = require('@/utils/utils');
    generateRandomTable.mockClear();

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN: generateRandomTable called with 6x6
    expect(generateRandomTable).toHaveBeenCalledWith(6, 6, 'en', []);
  });

  it('should use difficulty-based grid size for non-blast modes', () => {
    // GIVEN
    const { useGameMode } = require('@/hooks/gameState');
    (useGameMode as jest.Mock).mockReturnValue('classic');
    const { generateRandomTable } = require('@/utils/utils');
    generateRandomTable.mockClear();

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN
    act(() => {
      result.current.startGame();
    });

    // THEN: MEDIUM difficulty = 5x5
    expect(generateRandomTable).toHaveBeenCalledWith(5, 5, 'en', []);
  });
});
