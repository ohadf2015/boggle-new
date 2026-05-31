import { vi } from 'vitest';
/**
 * useHostGameActions - `leaving` flag wiring test
 *
 * Same black-screen-on-exit root cause as the player path: the navigation
 * guard's teardown go(-1) races the window.location.reload in confirmExitRoom
 * and blanks the native WebView. useNavigationGuard skips that pop when
 * leaving=true, but the host exit path never set it. Contract: confirmExitRoom
 * flips an exposed `leaving` flag true synchronously (same commit as
 * setGameStarted(false) which disables the guard).
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

describe('useHostGameActions - leaving flag (black-screen-on-exit fix)', () => {
  const mockEmit = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit, disconnect: vi.fn() } as any;
  const noop = vi.fn();

  const baseOptions: any = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('exposes leaving=false before exit', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));
    expect(result.current.leaving).toBe(false);
  });

  it('flips leaving=true synchronously when confirmExitRoom fires', () => {
    const { result } = renderHook(() => useHostGameActions(baseOptions));
    act(() => { result.current.confirmExitRoom(); });
    expect(result.current.leaving).toBe(true);
  });
});
