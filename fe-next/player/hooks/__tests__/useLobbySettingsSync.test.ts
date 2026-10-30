import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLobbySettingsSync } from '../useLobbySettingsSync';
import { useLobbySettingsFor, useLobbySettingsStore } from '@/components/multiplayer/lobby/lobbySettingsStore';

function fakeSocket() {
  const handlers = new Map<string, Set<(d?: unknown) => void>>();
  return {
    handlers,
    fire: (e: string, d?: unknown) => handlers.get(e)?.forEach((h) => h(d)),
    socket: {
      emit: vi.fn(),
      on: vi.fn((e: string, h: (d?: unknown) => void) => { if (!handlers.has(e)) handlers.set(e, new Set()); handlers.get(e)!.add(h); }),
      off: vi.fn((e: string, h: (d?: unknown) => void) => { handlers.get(e)?.delete(h); }),
    },
  };
}

const SETTINGS = { gameCode: 'ROOM1', mode: 'blast', timerSeconds: 90, difficulty: 'HARD', minWordLength: 3 };

describe('useLobbySettingsSync (joiner)', () => {
  beforeEach(() => useLobbySettingsStore.setState({ settings: null }));

  it('asks the server for the current pick on mount (late joiner)', () => {
    const s = fakeSocket();
    renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    expect(s.socket.emit).toHaveBeenCalledWith('requestLobbySettings');
  });

  it('asks again after a reconnect', () => {
    const s = fakeSocket();
    renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    s.socket.emit.mockClear();
    act(() => s.fire('connect'));
    expect(s.socket.emit).toHaveBeenCalledWith('requestLobbySettings');
  });

  it('stores the host pick and follows later changes', () => {
    const s = fakeSocket();
    renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    const view = renderHook(() => useLobbySettingsFor('ROOM1'));
    act(() => s.fire('lobbySettings', SETTINGS));
    expect(view.result.current?.mode).toBe('blast');
    act(() => s.fire('lobbySettings', { ...SETTINGS, mode: 'word-hunt', timerSeconds: 120 }));
    expect(view.result.current).toMatchObject({ mode: 'word-hunt', timerSeconds: 120 });
  });

  it('never shows another room\'s pick', () => {
    const s = fakeSocket();
    renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    act(() => s.fire('lobbySettings', { ...SETTINGS, gameCode: 'OTHER' }));
    expect(renderHook(() => useLobbySettingsFor('ROOM1')).result.current).toBeNull();
    act(() => s.fire('lobbySettings', SETTINGS));
    expect(renderHook(() => useLobbySettingsFor('NEWROOM')).result.current).toBeNull();
  });

  it('drops a malformed payload', () => {
    const s = fakeSocket();
    renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    act(() => s.fire('lobbySettings', { gameCode: 'ROOM1', mode: 'chess' }));
    expect(renderHook(() => useLobbySettingsFor('ROOM1')).result.current).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const s = fakeSocket();
    const { unmount } = renderHook(() => useLobbySettingsSync(s.socket as never, 'ROOM1'));
    unmount();
    expect(s.handlers.get('lobbySettings')?.size ?? 0).toBe(0);
    expect(s.handlers.get('connect')?.size ?? 0).toBe(0);
  });
});
