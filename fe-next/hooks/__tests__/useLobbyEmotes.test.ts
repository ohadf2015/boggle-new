import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLobbyEmotes } from '../useLobbyEmotes';

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
    __fire: (event: string, ...args: unknown[]) => {
      (handlers[event] || []).forEach((h) => h(...args));
    },
    __count: (event: string) => (handlers[event] || []).length,
  };
}

describe('useLobbyEmotes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits lobbyEmote and optimistically shows the sender own emote', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => result.current.sendEmote('emoteAngry'));

    expect(socket.emit).toHaveBeenCalledWith('lobbyEmote', { emote: 'emoteAngry' });
    expect(result.current.emotesByUsername['me']?.emote).toBe('emoteAngry');
  });

  it('cooldown blocks a second immediate send (emit once)', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => {
      result.current.sendEmote('emoteWink');
      result.current.sendEmote('emoteLaugh');
    });

    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(result.current.cooldownActive).toBe(true);
  });

  it('cooldown lifts after the cooldown window', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );
    act(() => result.current.sendEmote('emoteWink'));
    expect(result.current.cooldownActive).toBe(true);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.cooldownActive).toBe(false);
  });

  it('applies an incoming emote from another player', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'alex', emote: 'emoteLove' }));

    expect(result.current.emotesByUsername['alex']?.emote).toBe('emoteLove');
    expect(result.current.emotesByUsername['alex']?.nonce).toBe(1);
  });

  it('bumps nonce when the same player repeats an emote (re-trigger)', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'alex', emote: 'emoteLove' }));
    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'alex', emote: 'emoteLove' }));

    expect(result.current.emotesByUsername['alex']?.nonce).toBe(2);
  });

  it('auto-clears an emote after its mood duration', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'alex', emote: 'emoteShock' }));
    expect(result.current.emotesByUsername['alex']).toBeDefined();

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.emotesByUsername['alex']).toBeUndefined();
  });

  it('ignores an invalid / spoofed emote id', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );

    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'alex', emote: 'correct' }));
    act(() => socket.__fire('lobbyEmoteUpdate', { username: 'x', emote: 'junk' }));

    expect(result.current.emotesByUsername['alex']).toBeUndefined();
    expect(result.current.emotesByUsername['x']).toBeUndefined();
  });

  it('removes its listener on unmount', () => {
    const socket = makeMockSocket();
    const { unmount } = renderHook(() =>
      useLobbyEmotes({ socket: socket as never, username: 'me' }),
    );
    expect(socket.__count('lobbyEmoteUpdate')).toBe(1);
    unmount();
    expect(socket.__count('lobbyEmoteUpdate')).toBe(0);
  });
});
