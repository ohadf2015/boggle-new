/**
 * useShiritoriInit — the MP view mounts on `startGame`, then polls the server
 * (`requestShiritoriState`) and waits for the `shiritoriInit` snapshot before it
 * can seed useShiritoriGame with the roster/turn. Mirrors WheelRushView's
 * requestWheelRushState pattern. Tested with a mock socket.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShiritoriInit, type ShiritoriInitPayload } from '../useShiritoriInit';
import type { ShiritoriSocketLike } from '../useShiritoriGame';

function mockSocket() {
  const handlers = new Map<string, ((d: unknown) => void)[]>();
  const emit = vi.fn();
  const socket: ShiritoriSocketLike = {
    on: (e, h) => { handlers.set(e, [...(handlers.get(e) ?? []), h]); },
    off: (e, h) => { handlers.set(e, (handlers.get(e) ?? []).filter((x) => x !== h)); },
    emit,
  };
  const fire = (e: string, d: unknown) => act(() => { (handlers.get(e) ?? []).forEach((h) => h(d)); });
  return { socket, fire, emit };
}

const INIT: ShiritoriInitPayload = {
  players: ['me', 'bob'],
  currentPlayer: 'me',
  requiredHead: null,
  chain: [],
  eliminated: [],
  finished: false,
  winner: null,
};

describe('useShiritoriInit', () => {
  it('requests state on mount', () => {
    const { socket, emit } = mockSocket();
    renderHook(() => useShiritoriInit(socket));
    expect(emit).toHaveBeenCalledWith('requestShiritoriState', {});
  });

  it('returns null until the snapshot arrives', () => {
    const { socket } = mockSocket();
    const { result } = renderHook(() => useShiritoriInit(socket));
    expect(result.current).toBeNull();
  });

  it('returns the snapshot once shiritoriInit fires', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useShiritoriInit(socket));
    fire('shiritoriInit', INIT);
    expect(result.current).toEqual(INIT);
  });

  it('re-requests state on reconnect', () => {
    const { socket, fire, emit } = mockSocket();
    renderHook(() => useShiritoriInit(socket));
    emit.mockClear();
    fire('connect', {});
    expect(emit).toHaveBeenCalledWith('requestShiritoriState', {});
  });

  it('does nothing without a socket', () => {
    const { result } = renderHook(() => useShiritoriInit(null));
    expect(result.current).toBeNull();
  });
});
