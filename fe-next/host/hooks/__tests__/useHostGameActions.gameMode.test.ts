import { vi, type Mock, } from 'vitest';
/**
 * useHostGameActions - Game Mode Tests
 * Tests that handleStartNewGame (Play Again) emits gameMode to server.
 */

// Mock dependencies used by the hook
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
  useGameMode: vi.fn().mockReturnValue('blast'),
  useHostSelectedGameMode: vi.fn().mockReturnValue('blast'),
}));

import { renderHook, act } from '@testing-library/react';
import { useHostGameActions } from '../useHostGameActions';
import { useGameMode, useHostSelectedGameMode } from '@/hooks/gameState';
import { generateRandomTable } from '@/utils/utils';

describe('useHostGameActions - gameMode in handleStartNewGame', () => {
  const mockEmit = vi.fn();
  const mockSocket = {
    connected: true,
    emit: mockEmit,
  } as any;

  const noop = vi.fn();
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
    vi.clearAllMocks();
    // Make resetGame callback invoke immediately with success
    mockEmit.mockImplementation((event: string, _data: any, callback?: any) => {
      if (event === 'resetGame' && typeof callback === 'function') {
        callback({ success: true, gameState: 'waiting' });
      }
    });
  });

  it('should include host-selected gameMode in handleStartNewGame emit', () => {
    // GIVEN: hook is rendered with hostSelectedGameMode = 'blast' (from mock).
    // The emit must use the host's *intent* (preserved across rounds), not
    // the resolved gameMode — otherwise "random" intent locks to the rolled mode.
    (useHostSelectedGameMode as any).mockReturnValue('blast');
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN: handleStartNewGame is called (Play Again)
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN: the second emit (startGame) should include the host's intent
    const startGameCall = mockEmit.mock.calls.find(
      (call: any[]) => call[0] === 'startGame'
    );
    expect(startGameCall).toBeDefined();
    expect(startGameCall![1]).toEqual(
      expect.objectContaining({ gameMode: 'blast' })
    );
  });

  it('preserves "random" intent across rounds (regression: random stayed locked)', () => {
    // GIVEN: host originally picked "random". Server resolved it to 'blast' for
    // round 1, so `useGameMode` (resolved) reports 'blast'. But the host's intent
    // — `useHostSelectedGameMode` — is still 'random'.
    (useGameMode as any).mockReturnValue('blast');
    (useHostSelectedGameMode as any).mockReturnValue('random');

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN: host clicks "Play Again"
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN: emit must send 'random' (intent) so the server re-rolls,
    // not 'blast' (the resolved mode from the previous round)
    const startGameCall = mockEmit.mock.calls.find(
      (call: any[]) => call[0] === 'startGame'
    );
    expect(startGameCall).toBeDefined();
    expect(startGameCall![1]).toEqual(
      expect.objectContaining({ gameMode: 'random' })
    );
  });

  it('should default gameMode to random when host intent is undefined', () => {
    // GIVEN: useHostSelectedGameMode returns undefined (mocked)
    (useHostSelectedGameMode as any).mockReturnValue(undefined);

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
    (useGameMode as any).mockReturnValue('blast');

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
    (useGameMode as any).mockReturnValue('blast');
    generateRandomTable.mockClear();

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN
    act(() => {
      result.current.handleStartNewGame();
    });

    // THEN: generateRandomTable called with 6x6
    expect(generateRandomTable).toHaveBeenCalledWith(6, 6, 'en', []);
  });

  it('does NOT show the start animation optimistically on click (sync with players)', () => {
    // GIVEN: a spy on setShowStartAnimation. The host countdown must be driven
    // by the server `startGame` broadcast (same trigger as players) so host and
    // players see 3-2-1-GO at the same time. Starting it optimistically on click
    // put the host a full network round-trip ahead — the reported desync.
    (useGameMode as any).mockReturnValue('classic');
    const setShowStartAnimation = vi.fn();
    const { result } = renderHook(() =>
      useHostGameActions({ ...baseOptions, setShowStartAnimation })
    );

    // WHEN: host clicks Start (multiplayer: 2 players)
    act(() => {
      result.current.startGame();
    });

    // THEN: startGame is emitted, but the animation is NOT triggered yet
    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeDefined();
    expect(setShowStartAnimation).not.toHaveBeenCalledWith(true);
  });

  it('should use difficulty-based grid size for non-blast modes', () => {
    // GIVEN
    (useGameMode as any).mockReturnValue('classic');
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
