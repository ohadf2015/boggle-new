import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatUnread } from '../useChatUnread';

function fakeSocket() {
  const handlers = new Map<string, (data: unknown) => void>();
  return {
    on: vi.fn((evt: string, fn: (data: unknown) => void) => handlers.set(evt, fn)),
    off: vi.fn((evt: string) => handlers.delete(evt)),
    fire: (evt: string, data: unknown) => handlers.get(evt)?.(data),
    handlers,
  };
}

describe('useChatUnread — the header chat icon badge', () => {
  it('counts messages from others while the chat sheet is closed', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useChatUnread({ socket: socket as never, username: 'Ada', open: false }));
    act(() => socket.fire('chatMessage', { username: 'Bo', message: 'hi' }));
    act(() => socket.fire('chatMessage', { username: 'Cy', message: 'yo' }));
    expect(result.current).toBe(2);
  });

  it('ignores my own echoed messages', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useChatUnread({ socket: socket as never, username: 'Ada', open: false }));
    act(() => socket.fire('chatMessage', { username: 'Ada', message: 'me' }));
    expect(result.current).toBe(0);
  });

  it('clears when the sheet opens and stops counting while it is open', () => {
    const socket = fakeSocket();
    const { result, rerender } = renderHook(
      ({ open }) => useChatUnread({ socket: socket as never, username: 'Ada', open }),
      { initialProps: { open: false } },
    );
    act(() => socket.fire('chatMessage', { username: 'Bo', message: 'hi' }));
    expect(result.current).toBe(1);
    rerender({ open: true });
    expect(result.current).toBe(0);
    act(() => socket.fire('chatMessage', { username: 'Bo', message: 'again' }));
    expect(result.current).toBe(0);
  });

  it('unsubscribes on unmount and tolerates no socket', () => {
    const socket = fakeSocket();
    const { unmount } = renderHook(() => useChatUnread({ socket: socket as never, username: 'Ada', open: false }));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('chatMessage', expect.any(Function));
    const { result } = renderHook(() => useChatUnread({ socket: null, username: 'Ada', open: false }));
    expect(result.current).toBe(0);
  });
});
