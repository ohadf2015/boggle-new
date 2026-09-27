import { vi } from 'vitest';
/**
 * usePlayerExit - `leaving` flag wiring test
 *
 * Bug: exiting an MP room on native shows a BLACK screen. Root cause — the
 * navigation guard's teardown fires a synchronous history.go(-1) phantom-pop
 * that race-cancels the exit's window.location.reload (the WebView blanks).
 * useNavigationGuard already skips that pop when `leaving=true` (proven in
 * useNavigationGuard.test.ts), but the MP player exit path never set it.
 *
 * Contract: confirmExitRoom must flip an exposed `leaving` flag to true
 * SYNCHRONOUSLY (in the same commit that disables the guard via setGameActive
 * (false)), so the guard's render-time leavingRef is true when its cleanup runs.
 */

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import { renderHook, act } from '@testing-library/react';
import { usePlayerExit } from '../usePlayerExit';

describe('usePlayerExit - leaving flag (black-screen-on-exit fix)', () => {
  const mockEmit = vi.fn();
  const mockDisconnect = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit, disconnect: mockDisconnect } as any;

  const baseParams = () => ({
    socket: mockSocket,
    gameCode: 'TEST',
    username: 'player',
    gameActive: true,
    setGameActive: vi.fn(),
    intentionalExitRef: { current: false } as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers(); // keep the setTimeout(reload) from firing jsdom navigation
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes leaving=false before exit', () => {
    const { result } = renderHook(() => usePlayerExit(baseParams()));
    expect(result.current.leaving).toBe(false);
  });

  it('flips leaving=true synchronously when confirmExitRoom fires', () => {
    const { result } = renderHook(() => usePlayerExit(baseParams()));

    act(() => {
      result.current.confirmExitRoom();
    });

    // Must be true immediately (before the 200ms reload timer), so the guard's
    // teardown in the SAME commit skips the racing go(-1).
    expect(result.current.leaving).toBe(true);
  });
});
