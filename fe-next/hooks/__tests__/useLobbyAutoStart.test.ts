import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLobbyAutoStart } from '../useLobbyAutoStart';

/** Minimal socket double that lets tests fire server events at registered handlers. */
function makeSocket() {
  const handlers: Record<string, ((data: unknown) => void)[]> = {};
  return {
    on: vi.fn((event: string, cb: (data: unknown) => void) => {
      (handlers[event] ||= []).push(cb);
    }),
    off: vi.fn((event: string, cb: (data: unknown) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    }),
    emit: vi.fn(),
    fire(event: string, data?: unknown) {
      (handlers[event] || []).forEach((h) => h(data));
    },
  };
}

describe('useLobbyAutoStart', () => {
  let socket: ReturnType<typeof makeSocket>;
  beforeEach(() => {
    socket = makeSocket();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    expect(result.current.secondsLeft).toBeNull();
    expect(result.current.isAutoStarting).toBe(false);
  });

  it('tracks the server countdown tick', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 5 }));
    expect(result.current.secondsLeft).toBe(5);
    expect(result.current.isAutoStarting).toBe(true);
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 4 }));
    expect(result.current.secondsLeft).toBe(4);
  });

  it('clears on cancellation', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 3 }));
    act(() => socket.fire('lobbyAutoStartCancelled', {}));
    expect(result.current.secondsLeft).toBeNull();
    expect(result.current.isAutoStarting).toBe(false);
  });

  it('invokes onFire and clears when the countdown fires', () => {
    const onFire = vi.fn();
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never, onFire }));
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 1 }));
    act(() => socket.fire('lobbyAutoStartFire', {}));
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(result.current.secondsLeft).toBeNull();
  });

  it('uses the latest onFire without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useLobbyAutoStart({ socket: socket as never, onFire: cb }), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    act(() => socket.fire('lobbyAutoStartFire', {}));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cancel() emits lobbyAutoStartCancel and clears locally', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 4 }));
    act(() => result.current.cancel());
    expect(socket.emit).toHaveBeenCalledWith('lobbyAutoStartCancel');
    expect(result.current.secondsLeft).toBeNull();
  });

  it('clears countdown when the round resets', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    act(() => socket.fire('lobbyAutoStartTick', { secondsLeft: 3 }));
    act(() => socket.fire('resetGame', {}));
    expect(result.current.secondsLeft).toBeNull();
  });

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() => useLobbyAutoStart({ socket: socket as never }));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('lobbyAutoStartTick', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('lobbyAutoStartFire', expect.any(Function));
  });

  it('is inert with a null socket', () => {
    const { result } = renderHook(() => useLobbyAutoStart({ socket: null }));
    expect(result.current.secondsLeft).toBeNull();
    act(() => result.current.cancel()); // must not throw
  });
});
