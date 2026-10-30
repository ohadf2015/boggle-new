import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBroadcastLobbySettings, LOBBY_SETTINGS_DEBOUNCE_MS } from '../useBroadcastLobbySettings';

function fakeSocket() {
  const handlers = new Map<string, Set<() => void>>();
  return {
    fire: (e: string) => handlers.get(e)?.forEach((h) => h()),
    socket: {
      emit: vi.fn(),
      on: vi.fn((e: string, h: () => void) => { if (!handlers.has(e)) handlers.set(e, new Set()); handlers.get(e)!.add(h); }),
      off: vi.fn((e: string, h: () => void) => { handlers.get(e)?.delete(h); }),
    },
  };
}

const base = { gameCode: 'ROOM1', enabled: true, mode: 'random' as const, timerValue: 1.5, difficulty: 'MEDIUM' as const, minWordLength: 2 };

describe('useBroadcastLobbySettings (host)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('publishes the lobby pick once mounted', () => {
    const s = fakeSocket();
    renderHook(() => useBroadcastLobbySettings({ socket: s.socket as never, ...base }));
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS); });
    expect(s.socket.emit).toHaveBeenCalledWith('updateLobbySettings', {
      gameCode: 'ROOM1', mode: 'random', timerSeconds: 90, difficulty: 'MEDIUM', minWordLength: 2,
    });
  });

  it('publishes a change after join, coalescing rapid taps into one emit', () => {
    const s = fakeSocket();
    const { rerender } = renderHook((p: typeof base) => useBroadcastLobbySettings({ socket: s.socket as never, ...p }), { initialProps: base });
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS); });
    s.socket.emit.mockClear();
    rerender({ ...base, mode: 'classic' as never });
    rerender({ ...base, mode: 'blast' as never, timerValue: 3, difficulty: 'HARD' as never });
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS); });
    expect(s.socket.emit).toHaveBeenCalledTimes(1);
    expect(s.socket.emit).toHaveBeenCalledWith('updateLobbySettings', expect.objectContaining({ mode: 'blast', timerSeconds: 180, difficulty: 'HARD' }));
  });

  it('stays quiet outside the lobby', () => {
    const s = fakeSocket();
    renderHook(() => useBroadcastLobbySettings({ socket: s.socket as never, ...base, enabled: false }));
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS * 2); });
    expect(s.socket.emit).not.toHaveBeenCalled();
  });

  it('re-publishes after a reconnect', () => {
    const s = fakeSocket();
    renderHook(() => useBroadcastLobbySettings({ socket: s.socket as never, ...base }));
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS); });
    s.socket.emit.mockClear();
    act(() => s.fire('connect'));
    act(() => { vi.advanceTimersByTime(LOBBY_SETTINGS_DEBOUNCE_MS); });
    expect(s.socket.emit).toHaveBeenCalledWith('updateLobbySettings', expect.objectContaining({ gameCode: 'ROOM1' }));
  });
});
