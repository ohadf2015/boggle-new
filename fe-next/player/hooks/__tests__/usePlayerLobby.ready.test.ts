import { vi } from 'vitest';
/**
 * usePlayerLobby — lobby "ready" toggle wiring
 *
 * The server already has the full ready infra: a `lobbyReady` handler (gates on
 * gameState==='waiting'), `playersReadyForNextGame` store, and a
 * `playersReadyUpdate` broadcast. But NOTHING client-side emitted `lobbyReady`
 * and this hook discarded the update (`void data`). These tests pin the wiring
 * that lets a non-host player flag themselves ready and lets every client see
 * who is ready.
 */

import { renderHook, act } from '@testing-library/react';
import { usePlayerLobby } from '../usePlayerLobby';

type Handler = (...args: unknown[]) => void;

function makeMockSocket() {
  const handlers: Record<string, Handler[]> = {};
  const emit = vi.fn();
  return {
    emit,
    on: (event: string, cb: Handler) => {
      (handlers[event] ||= []).push(cb);
    },
    off: (event: string, cb: Handler) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    },
    /** test helper: fire a server event */
    __fire: (event: string, ...args: unknown[]) => {
      (handlers[event] || []).forEach((h) => h(...args));
    },
  };
}

const baseParams = (socket: ReturnType<typeof makeMockSocket>, username = 'me') => ({
  socket: socket as never,
  gameActive: false,
  showModeReveal: false,
  showStartAnimation: false,
  username,
});

describe('usePlayerLobby — ready toggle', () => {
  it('starts not-ready with an empty ready list', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket)));
    expect(result.current.isReady).toBe(false);
    expect(result.current.readyUsernames).toEqual([]);
  });

  it('emits lobbyReady{ready:true} when toggling on from not-ready', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket)));
    act(() => result.current.toggleReady());
    expect(socket.emit).toHaveBeenCalledWith('lobbyReady', { ready: true });
  });

  it('reflects server playersReadyUpdate and derives isReady for self', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket, 'me')));
    act(() => {
      socket.__fire('playersReadyUpdate', {
        readyCount: 2,
        totalPlayers: 3,
        readyUsernames: ['me', 'alex'],
      });
    });
    expect(result.current.readyUsernames).toEqual(['me', 'alex']);
    expect(result.current.isReady).toBe(true);
  });

  it('toggles OFF (ready:false) once self is ready', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket, 'me')));
    act(() => {
      socket.__fire('playersReadyUpdate', { readyCount: 1, totalPlayers: 2, readyUsernames: ['me'] });
    });
    act(() => result.current.toggleReady());
    expect(socket.emit).toHaveBeenCalledWith('lobbyReady', { ready: false });
  });

  /**
   * Rage-click regression (PostHog: "Ready Up!"/"Ready!" hammered in 6 sessions).
   * A second tap before the server echo must not emit twice — but ready is a
   * TOGGLE, so the echo has to release the lock immediately. An earlier fix held
   * it on a 3s timer, which locked a player out of changing their mind.
   */
  it('swallows a second tap before the echo, then frees the toggle once the echo lands', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket, 'me')));

    act(() => result.current.toggleReady());
    act(() => result.current.toggleReady()); // impatient second tap, no echo yet
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(result.current.readyInFlight).toBe(true);

    act(() => {
      socket.__fire('playersReadyUpdate', { readyCount: 1, totalPlayers: 2, readyUsernames: ['me'] });
    });
    expect(result.current.readyInFlight).toBe(false);

    act(() => result.current.toggleReady()); // changed their mind — must go through at once
    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenLastCalledWith('lobbyReady', { ready: false });
  });

  it('clears the ready list on resetGame', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() => usePlayerLobby(baseParams(socket, 'me')));
    act(() => {
      socket.__fire('playersReadyUpdate', { readyCount: 1, totalPlayers: 2, readyUsernames: ['me'] });
    });
    expect(result.current.readyUsernames).toEqual(['me']);
    act(() => socket.__fire('resetGame'));
    expect(result.current.readyUsernames).toEqual([]);
    expect(result.current.isReady).toBe(false);
  });
});
