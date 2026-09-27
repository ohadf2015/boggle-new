import { vi } from 'vitest';
/**
 * usePlayerExit - SPA exit-to-lobby (no hard reload) test
 *
 * Follow-up to the black-screen-on-exit fix. The legacy in-game exit did a hard
 * `window.location.reload()` — the exact op the results/grace-modal exit
 * (`handleExitToLobby` in PageClient) deliberately AVOIDS because it blanks the
 * Capacitor WebView. When PageClient wires an `onExitToLobby` callback, the
 * player exit must reset MP state IN PLACE via that callback (the proven SPA
 * pattern) instead of reloading.
 *
 * Contract:
 *  - When `onExitToLobby` is provided, confirmExitRoom delegates to it and
 *    schedules NO reload timer (so socket.disconnect, which only the legacy
 *    reload branch calls, never fires).
 *  - The delegate owns the leaveRoom emit, so confirmExitRoom must NOT also emit
 *    (no double-leave).
 *  - The `leaving` guard flag still flips true synchronously.
 *  - When `onExitToLobby` is absent, the legacy reload path is unchanged.
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

describe('usePlayerExit - SPA exit-to-lobby (no reload)', () => {
  const mockEmit = vi.fn();
  const mockDisconnect = vi.fn();
  const mockSocket = { connected: true, emit: mockEmit, disconnect: mockDisconnect } as any;

  const baseParams = (extra: Record<string, unknown> = {}) => ({
    socket: mockSocket,
    gameCode: 'TEST',
    username: 'player',
    gameActive: true,
    setGameActive: vi.fn(),
    intentionalExitRef: { current: false } as any,
    ...extra,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delegates to onExitToLobby and schedules NO reload (socket never disconnects)', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => usePlayerExit(baseParams({ onExitToLobby })));

    act(() => {
      result.current.confirmExitRoom();
    });
    act(() => {
      vi.runAllTimers(); // legacy reload branch would disconnect here
    });

    expect(onExitToLobby).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('does NOT emit leaveRoom itself when delegating (delegate owns it — no double-leave)', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => usePlayerExit(baseParams({ onExitToLobby })));

    act(() => {
      result.current.confirmExitRoom();
    });

    const leaveCalls = mockEmit.mock.calls.filter((c: any[]) => c[0] === 'leaveRoom');
    expect(leaveCalls.length).toBe(0);
  });

  it('still flips leaving=true synchronously in the delegated path', () => {
    const onExitToLobby = vi.fn();
    const { result } = renderHook(() => usePlayerExit(baseParams({ onExitToLobby })));

    act(() => {
      result.current.confirmExitRoom();
    });

    expect(result.current.leaving).toBe(true);
  });

  it('falls back to the legacy reload path (emits leaveRoom, disconnects) when no callback', () => {
    const { result } = renderHook(() => usePlayerExit(baseParams()));

    act(() => {
      result.current.confirmExitRoom();
    });
    act(() => {
      vi.runAllTimers();
    });

    const leaveCalls = mockEmit.mock.calls.filter((c: any[]) => c[0] === 'leaveRoom');
    expect(leaveCalls.length).toBe(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
