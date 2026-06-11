/**
 * useLobbyAdGate — bridges the local rewarded-ad pause bus to a lobby-scoped
 * socket presence signal, and reports whether ANY player in the room is mid-ad
 * (so the host can disable Start).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let localAdActive = false;
vi.mock('@/hooks/useRewardAdPause', () => ({
  useRewardAdPause: () => localAdActive,
}));

import { useLobbyAdGate } from '../useLobbyAdGate';

type Handler = (payload: unknown) => void;
function makeSocket() {
  const handlers: Record<string, Handler> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((e: string, h: Handler) => { handlers[e] = h; }),
    off: vi.fn((e: string) => { delete handlers[e]; }),
    _emitToClient: (e: string, p: unknown) => handlers[e]?.(p),
    _handlers: handlers,
  };
}

describe('useLobbyAdGate', () => {
  beforeEach(() => { localAdActive = false; });

  it('emits active=true when the local ad starts', () => {
    const socket = makeSocket();
    const { rerender } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    socket.emit.mockClear();

    localAdActive = true;
    rerender();
    expect(socket.emit).toHaveBeenCalledWith('lobby:adWatching', { active: true });
  });

  it('emits active=false when the local ad ends', () => {
    const socket = makeSocket();
    const { rerender } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    localAdActive = true; rerender();
    socket.emit.mockClear();
    localAdActive = false; rerender();
    expect(socket.emit).toHaveBeenCalledWith('lobby:adWatching', { active: false });
  });

  it('does not emit a spurious active=false on initial mount', () => {
    const socket = makeSocket();
    renderHook(() => useLobbyAdGate({ socket: socket as never }));
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('reports anyAdActive=true while the local ad is active even with no remote watchers', () => {
    const socket = makeSocket();
    localAdActive = true;
    const { result } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    expect(result.current.anyAdActive).toBe(true);
  });

  it('reports anyAdActive=true when a remote player is watching', () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    expect(result.current.anyAdActive).toBe(false);
    act(() => socket._emitToClient('lobbyAdWatchingUpdate', { usernames: ['Bob'] }));
    expect(result.current.anyAdActive).toBe(true);
    expect(result.current.watchers).toEqual(['Bob']);
  });

  it('clears anyAdActive when the room update goes empty', () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    act(() => socket._emitToClient('lobbyAdWatchingUpdate', { usernames: ['Bob'] }));
    act(() => socket._emitToClient('lobbyAdWatchingUpdate', { usernames: [] }));
    expect(result.current.anyAdActive).toBe(false);
  });

  it('subscribes and unsubscribes the room listener', () => {
    const socket = makeSocket();
    const { unmount } = renderHook(() => useLobbyAdGate({ socket: socket as never }));
    expect(socket.on).toHaveBeenCalledWith('lobbyAdWatchingUpdate', expect.any(Function));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('lobbyAdWatchingUpdate', expect.any(Function));
  });
});
