/**
 * useSafeSocketEvent / useSafeSocketEvents / useSocketEmit Tests
 *
 * Covers: mount/unmount cleanup, enabled toggle, handlerRef stability,
 * event name changes, null socket, error handling, multi-event variant,
 * JSON.stringify dep gap, and emit helpers.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSafeSocketEvent,
  useSafeSocketEvents,
  useSocketEmit,
} from '../useSafeSocketEvent';

// --- Mock Socket Factory ---
function createMockSocket() {
  const listeners = new Map<string, Set<Function>>();
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      listeners.get(event)?.delete(handler);
    }),
    emit: vi.fn(),
    emitWithAck: vi.fn(),
    // Helper to simulate incoming event
    _trigger(event: string, data: unknown) {
      listeners.get(event)?.forEach(fn => fn(data));
    },
    _listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0;
    },
  };
}

type MockSocket = ReturnType<typeof createMockSocket>;

describe('useSafeSocketEvent', () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
  });

  // --- Basic mount/unmount ---

  it('registers listener on mount and removes on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useSafeSocketEvent({ socket: socket as any, event: 'test', handler })
    );

    expect(socket.on).toHaveBeenCalledWith('test', expect.any(Function));
    expect(socket._listenerCount('test')).toBe(1);

    unmount();

    expect(socket.off).toHaveBeenCalledWith('test', expect.any(Function));
    expect(socket._listenerCount('test')).toBe(0);
  });

  // --- Enabled/disabled ---

  it('does not register listener when enabled=false', () => {
    const handler = vi.fn();
    renderHook(() =>
      useSafeSocketEvent({ socket: socket as any, event: 'test', handler, enabled: false })
    );

    expect(socket.on).not.toHaveBeenCalled();
  });

  it('adds listener when toggled from disabled to enabled', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useSafeSocketEvent({ socket: socket as any, event: 'test', handler, enabled }),
      { initialProps: { enabled: false } }
    );

    expect(socket.on).not.toHaveBeenCalled();

    rerender({ enabled: true });

    expect(socket.on).toHaveBeenCalledWith('test', expect.any(Function));
    expect(socket._listenerCount('test')).toBe(1);
  });

  it('removes listener when toggled from enabled to disabled', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useSafeSocketEvent({ socket: socket as any, event: 'test', handler, enabled }),
      { initialProps: { enabled: true } }
    );

    expect(socket._listenerCount('test')).toBe(1);

    rerender({ enabled: false });

    expect(socket._listenerCount('test')).toBe(0);
  });

  // --- Handler ref stability ---

  it('does not re-register when only handler reference changes', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { rerender } = renderHook(
      ({ handler }) =>
        useSafeSocketEvent({ socket: socket as any, event: 'test', handler }),
      { initialProps: { handler: handler1 } }
    );

    expect(socket.on).toHaveBeenCalledTimes(1);

    rerender({ handler: handler2 });

    // Should NOT have re-subscribed — still 1 call
    expect(socket.on).toHaveBeenCalledTimes(1);

    // But triggering the event should call the NEW handler via ref
    socket._trigger('test', { value: 42 });
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith({ value: 42 });
  });

  // --- Event name change ---

  it('unsubscribes old event and subscribes new when event name changes', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ event }) =>
        useSafeSocketEvent({ socket: socket as any, event, handler }),
      { initialProps: { event: 'alpha' } }
    );

    expect(socket.on).toHaveBeenCalledWith('alpha', expect.any(Function));

    rerender({ event: 'beta' });

    expect(socket.off).toHaveBeenCalledWith('alpha', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('beta', expect.any(Function));
    expect(socket._listenerCount('alpha')).toBe(0);
    expect(socket._listenerCount('beta')).toBe(1);
  });

  // --- Null socket ---

  it('does not crash when socket is null', () => {
    const handler = vi.fn();
    expect(() => {
      renderHook(() =>
        useSafeSocketEvent({ socket: null, event: 'test', handler })
      );
    }).not.toThrow();
  });

  it('registers listener when socket changes from null to valid', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ socket: s }) =>
        useSafeSocketEvent({ socket: s as any, event: 'test', handler }),
      { initialProps: { socket: null as MockSocket | null } }
    );

    expect(socket.on).not.toHaveBeenCalled();

    rerender({ socket });

    expect(socket.on).toHaveBeenCalledWith('test', expect.any(Function));
  });

  // --- Multiple rapid enabled toggles ---

  it('has exactly one listener after rapid enabled toggles', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useSafeSocketEvent({ socket: socket as any, event: 'test', handler, enabled }),
      { initialProps: { enabled: true } }
    );

    rerender({ enabled: false });
    rerender({ enabled: true });
    rerender({ enabled: false });
    rerender({ enabled: true });

    expect(socket._listenerCount('test')).toBe(1);
  });

  // --- Error handling ---

  it('calls onError when handler throws', async () => {
    const error = new Error('boom');
    const handler = vi.fn(() => { throw error; });
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    renderHook(() =>
      useSafeSocketEvent({ socket: socket as any, event: 'test', handler, onError })
    );

    await act(async () => {
      socket._trigger('test', {});
    });

    expect(onError).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });

  it('wraps non-Error throws in Error for onError', async () => {
    const handler = vi.fn(() => { throw 'string error'; });
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    renderHook(() =>
      useSafeSocketEvent({ socket: socket as any, event: 'test', handler, onError })
    );

    await act(async () => {
      socket._trigger('test', {});
    });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'string error' }));
    consoleSpy.mockRestore();
  });

  // --- deps ---

  it('re-subscribes when deps change', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ roomId }) =>
        useSafeSocketEvent({ socket: socket as any, event: 'test', handler, deps: [roomId] }),
      { initialProps: { roomId: 'A' } }
    );

    expect(socket.on).toHaveBeenCalledTimes(1);

    rerender({ roomId: 'B' });

    // Should have unsubscribed and re-subscribed
    expect(socket.off).toHaveBeenCalledTimes(1);
    expect(socket.on).toHaveBeenCalledTimes(2);
  });
});

describe('useSafeSocketEvents', () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
  });

  it('registers multiple event listeners on mount', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();

    renderHook(() =>
      useSafeSocketEvents({
        socket: socket as any,
        events: [
          { event: 'e1', handler: h1 },
          { event: 'e2', handler: h2 },
        ],
      })
    );

    expect(socket.on).toHaveBeenCalledWith('e1', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('e2', expect.any(Function));
  });

  it('cleans up all listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useSafeSocketEvents({
        socket: socket as any,
        events: [
          { event: 'e1', handler: vi.fn() },
          { event: 'e2', handler: vi.fn() },
        ],
      })
    );

    unmount();

    expect(socket._listenerCount('e1')).toBe(0);
    expect(socket._listenerCount('e2')).toBe(0);
  });

  it('respects per-event enabled flag', () => {
    renderHook(() =>
      useSafeSocketEvents({
        socket: socket as any,
        events: [
          { event: 'e1', handler: vi.fn(), enabled: true },
          { event: 'e2', handler: vi.fn(), enabled: false },
        ],
      })
    );

    expect(socket._listenerCount('e1')).toBe(1);
    expect(socket._listenerCount('e2')).toBe(0);
  });

  it('handler ref stays fresh — calls latest handler', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) =>
        useSafeSocketEvents({
          socket: socket as any,
          events: [{ event: 'e1', handler }],
        }),
      { initialProps: { handler: h1 } }
    );

    // Rerender with new handler (same event name so JSON.stringify dep unchanged)
    rerender({ handler: h2 });

    await act(async () => {
      socket._trigger('e1', 'data');
    });

    // Should call h2 (latest) not h1 (stale)
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith('data');
  });

  it('re-subscribes when events array structure changes', () => {
    const { rerender } = renderHook<void, { events: any }>(
      ({ events }) =>
        useSafeSocketEvents({ socket: socket as any, events }),
      {
        initialProps: {
          events: [{ event: 'e1', handler: vi.fn() }],
        },
      }
    );

    expect(socket.on).toHaveBeenCalledTimes(1);

    rerender({
      events: [
        { event: 'e1', handler: vi.fn() },
        { event: 'e2', handler: vi.fn() },
      ],
    });

    // Old listeners cleaned up, new ones registered
    expect(socket._listenerCount('e1')).toBe(1);
    expect(socket._listenerCount('e2')).toBe(1);
  });

  it('does not re-subscribe when only handler references change (JSON.stringify dep)', () => {
    const { rerender } = renderHook<void, { h: any }>(
      ({ h }) =>
        useSafeSocketEvents({
          socket: socket as any,
          events: [{ event: 'e1', handler: h }],
        }),
      { initialProps: { h: vi.fn() } }
    );

    expect(socket.on).toHaveBeenCalledTimes(1);

    // Different handler function but same event config shape
    rerender({ h: vi.fn() });

    // Should NOT re-subscribe (JSON.stringify of {event,enabled} is unchanged)
    expect(socket.on).toHaveBeenCalledTimes(1);
  });

  it('does not crash with null socket', () => {
    expect(() => {
      renderHook(() =>
        useSafeSocketEvents({
          socket: null,
          events: [{ event: 'e1', handler: vi.fn() }],
        })
      );
    }).not.toThrow();
  });

  it('calls onError with event name when handler throws', async () => {
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    renderHook(() =>
      useSafeSocketEvents({
        socket: socket as any,
        events: [{ event: 'boom-event', handler: () => { throw new Error('fail'); } }],
        onError,
      })
    );

    await act(async () => {
      socket._trigger('boom-event', {});
    });

    expect(onError).toHaveBeenCalledWith('boom-event', expect.objectContaining({ message: 'fail' }));
    consoleSpy.mockRestore();
  });
});

describe('useSocketEmit', () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
  });

  it('emits event with data', () => {
    const { result } = renderHook(() =>
      useSocketEmit({ socket: socket as any })
    );

    act(() => {
      result.current.emit('my-event', { foo: 1 });
    });

    expect(socket.emit).toHaveBeenCalledWith('my-event', { foo: 1 });
  });

  it('warns and does not throw when socket is null', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() =>
      useSocketEmit({ socket: null })
    );

    act(() => {
      result.current.emit('test', {});
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test'));
    consoleSpy.mockRestore();
  });

  it('emitWithAck returns result from socket', async () => {
    socket.emitWithAck.mockResolvedValue({ ok: true });

    const { result } = renderHook(() =>
      useSocketEmit({ socket: socket as any })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.emitWithAck('ack-event', { data: 1 });
    });

    expect(response).toEqual({ ok: true });
    expect(socket.emitWithAck).toHaveBeenCalledWith('ack-event', { data: 1 });
  });

  it('emitWithAck returns undefined and calls onError on failure', async () => {
    socket.emitWithAck.mockRejectedValue(new Error('timeout'));
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() =>
      useSocketEmit({ socket: socket as any, onError })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.emitWithAck('ack-event');
    });

    expect(response).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'timeout' }));
    consoleSpy.mockRestore();
  });

  it('emitWithAck returns undefined when socket is null', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() =>
      useSocketEmit({ socket: null })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.emitWithAck('test');
    });

    expect(response).toBeUndefined();
    consoleSpy.mockRestore();
  });
});
