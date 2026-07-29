import { vi } from 'vitest';
/**
 * useHostGameActions - SPA exit-to-lobby (no hard reload) test
 *
 * Follow-up to the black-screen-on-exit fix. The legacy host exit did a hard
 * `window.location.reload()` — the op the results/grace-modal exit
 * (`handleExitToLobby` in PageClient) avoids because it blanks the Capacitor
 * WebView. When PageClient wires an `onExitToLobby` callback, the host exit must
 * reset MP state IN PLACE via that callback instead of reloading.
 *
 * Contract mirrors the player path:
 *  - With `onExitToLobby`, confirmExitRoom delegates to it and schedules NO
 *    reload timer (socket.disconnect, only called by the legacy reload branch,
 *    never fires).
 *  - The delegate owns the leaveRoom emit, so confirmExitRoom must NOT also emit.
 *  - `leaving` still flips true synchronously.
 *  - Without the callback, the legacy reload path is unchanged.
 */

vi.mock('socket.io-client');
vi.mock('@/components/NeoToast', () => ({
  neoSuccessToast: vi.fn(),
  neoErrorToast: vi.fn(),
  neoInfoToast: vi.fn(),
  TOAST_ICONS: {},
}));
vi.mock('@/utils/session', () => ({ clearSessionPreservingUsername: vi.fn() }));
vi.mock('@/utils/utils', () => ({
  generateRandomTable: vi.fn().mockReturnValue([['A', 'B'], ['C', 'D']]),
}));
vi.mock('@/utils/consts', () => ({
  DIFFICULTIES: { EASY: { rows: 4, cols: 4 }, MEDIUM: { rows: 5, cols: 5 }, HARD: { rows: 6, cols: 6 } },
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

describe('useHostGameActions - SPA exit-to-lobby (no reload)', () => {
  const mockEmit = vi.fn();
  const mockDisconnect = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit, disconnect: mockDisconnect } as any;
  const noop = vi.fn();

  const baseOptions = (extra: Record<string, unknown> = {}): any => ({
    socket: mockSocket,
    gameCode: 'TEST',
    username: 'host',
    t: (key: string) => key,
    difficulty: 'MEDIUM',
    timerValue: 3,
    minWordLength: 2,
    hostPlaying: true,
    gameType: 'regular',
    tournamentRounds: 3,
    roomLanguage: 'en',
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
    intentionalExitRef: { current: false },
    setShowSoloConfirm: noop,
    tournamentTimeoutRef: { current: null },
    ...extra,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('delegates to onExitToLobby and schedules NO reload (socket never disconnects)', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => useHostGameActions(baseOptions({ onExitToLobby })));

    act(() => { result.current.confirmExitRoom(); });
    act(() => { vi.runAllTimers(); });

    expect(onExitToLobby).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('does NOT emit leaveRoom itself when delegating (delegate owns it)', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => useHostGameActions(baseOptions({ onExitToLobby })));

    act(() => { result.current.confirmExitRoom(); });

    const leaveCalls = mockEmit.mock.calls.filter((c: any[]) => c[0] === 'leaveRoom');
    expect(leaveCalls.length).toBe(0);
  });

  it('still flips leaving=true synchronously in the delegated path', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => useHostGameActions(baseOptions({ onExitToLobby })));

    act(() => { result.current.confirmExitRoom(); });

    expect(result.current.leaving).toBe(true);
  });

  it('falls back to the legacy reload path (emits leaveRoom, disconnects) when no callback', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions()));

    act(() => { result.current.confirmExitRoom(); });
    act(() => { vi.runAllTimers(); });

    const leaveCalls = mockEmit.mock.calls.filter((c: any[]) => c[0] === 'leaveRoom');
    expect(leaveCalls.length).toBe(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
