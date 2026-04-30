import { vi } from 'vitest';
/**
 * useHostGameActions - stopGame tests
 *
 * Verifies that when the host clicks X mid-game, the auto-advance countdown
 * on the results page does NOT keep ticking toward the next game.
 *
 * The fix: stopGame writes `mp-auto-advance-cancelled=1` to sessionStorage so
 * that StickyReadyBar (which reads the flag on mount) stays cancelled.
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
  useHostSelectedGameMode: vi.fn().mockReturnValue('random'),
}));

import { renderHook, act } from '@testing-library/react';
import { useHostGameActions } from '../useHostGameActions';

describe('useHostGameActions - stopGame cancels auto-advance countdown', () => {
  const mockEmit = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit } as any;
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
    sessionStorage.clear();
  });

  it('stopGame sets mp-auto-advance-cancelled flag in sessionStorage', () => {
    // GIVEN: a fresh session with no cancel flag
    expect(sessionStorage.getItem('mp-auto-advance-cancelled')).toBeNull();

    const { result } = renderHook(() => useHostGameActions(baseOptions));

    // WHEN: host clicks X → stopGame fires
    act(() => {
      result.current.stopGame();
    });

    // THEN: cancel flag is set so StickyReadyBar won't auto-advance
    expect(sessionStorage.getItem('mp-auto-advance-cancelled')).toBe('1');
  });

  it('stopGame still emits endGame to the server', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    act(() => {
      result.current.stopGame();
    });

    const endGameCall = mockEmit.mock.calls.find(
      (call: any[]) => call[0] === 'endGame'
    );
    expect(endGameCall).toBeDefined();
    expect(endGameCall![1]).toEqual({ gameCode: 'TEST' });
  });
});
