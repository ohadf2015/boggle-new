import { vi } from 'vitest';
/**
 * useHostGameActions - Solo-host start confirmation.
 *
 * A host alone in the lobby (no other players) who presses Start must be ASKED
 * whether to play with bots — never have bots silently added on their behalf.
 * The decision surface is the SoloStartConfirmDialog, opened via
 * setShowSoloConfirm(true); the actual game start only happens on confirm.
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

describe('useHostGameActions - solo-host start confirmation', () => {
  const mockEmit = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit } as any;
  const noop = vi.fn();
  const setShowSoloConfirm = vi.fn();
  const noopRef = { current: false } as any;
  const timeoutRef = { current: null } as any;

  const baseOptions = {
    socket: mockSocket,
    gameCode: 'SOLO',
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
    // Solo: only the host occupies the lobby.
    playersCount: 1,
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

  it('opens the solo-confirm dialog instead of starting when the host is alone', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    act(() => { result.current.startGame(); });

    // Decision returned to the host — dialog opens, game does NOT start yet.
    expect(setShowSoloConfirm).toHaveBeenCalledWith(true);
    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeUndefined();
  });

  it('starts the game only after the host confirms playing with bots', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));

    act(() => { result.current.confirmSoloStart(); });

    // Confirm closes the dialog and emits startGame; the server fills bots.
    expect(setShowSoloConfirm).toHaveBeenCalledWith(false);
    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeDefined();
  });

  it('starts directly (no dialog) when a human opponent is already present', () => {
    const { result } = renderHook(() =>
      useHostGameActions({ ...baseOptions, playersCount: 2 }),
    );

    act(() => { result.current.startGame(); });

    expect(setShowSoloConfirm).not.toHaveBeenCalledWith(true);
    expect(mockEmit.mock.calls.find((c: any[]) => c[0] === 'startGame')).toBeDefined();
  });
});
