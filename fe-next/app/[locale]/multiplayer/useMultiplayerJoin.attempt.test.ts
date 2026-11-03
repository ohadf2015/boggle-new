import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));
let sharedSocket: FakeSocket | null = null;
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => sharedSocket }));

import { useMultiplayerJoin } from './useMultiplayerJoin';

type Handler = (payload?: unknown) => void;
type FakeSocket = ReturnType<typeof makeSocket>;

function makeSocket(connected: boolean) {
  const handlers = new Map<string, Set<Handler>>();
  const add = (ev: string, fn: Handler) => { if (!handlers.has(ev)) handlers.set(ev, new Set()); handlers.get(ev)!.add(fn); };
  const socket = {
    connected,
    emit: vi.fn(),
    connect: vi.fn(),
    on: vi.fn((ev: string, fn: Handler) => { add(ev, fn); return socket; }),
    once: vi.fn((ev: string, fn: Handler) => {
      const wrapped: Handler = (p) => { handlers.get(ev)?.delete(wrapped); fn(p); };
      (wrapped as Handler & { orig?: Handler }).orig = fn;
      add(ev, wrapped);
      return socket;
    }),
    off: vi.fn((ev: string, fn?: Handler) => {
      const set = handlers.get(ev);
      if (!set) return socket;
      for (const h of [...set]) if (!fn || h === fn || (h as Handler & { orig?: Handler }).orig === fn) set.delete(h);
      return socket;
    }),
    listenerCount: (ev: string) => handlers.get(ev)?.size ?? 0,
    fire: (ev: string, payload?: unknown) => { for (const h of [...(handlers.get(ev) ?? [])]) h(payload); },
  };
  return socket;
}

function makeOptions(socket: FakeSocket | null) {
  return {
    socket: socket as never,
    gameCode: 'ABCD',
    username: 'Tester',
    roomName: 'Room',
    hostUsername: 'Tester',
    language: 'en' as const,
    t: (k: string) => k,
    isSupabaseEnabled: true,
    user: { id: 'user-1' },
    profile: null,
    loading: false,
    authLoadingStartTime: null,
    guestAvatar: { emoji: '🙂', color: '#FF6B6B' },
    setGuestAvatar: vi.fn(),
    setUsername: vi.fn(),
    setError: vi.fn(),
    setIsJoining: vi.fn(),
  };
}

const eventsNamed = (name: string): Array<Record<string, unknown>> =>
  trackGrowthEvent.mock.calls.filter(([n]) => n === name).map(([, p]) => p as Record<string, unknown>);
const outcomes = () => eventsNamed('mp_join_outcome');
const emitsOf = (s: FakeSocket, ev: string) => s.emit.mock.calls.filter(([e]) => e === ev);

describe('useMultiplayerJoin — one clean attempt per tap', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); sharedSocket = null; });
  afterEach(() => vi.useRealTimers());

  it('an early Quick Start tap waits for the shared socket instead of failing in milliseconds', async () => {
    sharedSocket = makeSocket(false);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(null)));

    await act(async () => { void result.current(true, null, undefined, undefined, undefined, { quickPlay: true }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(outcomes()).toEqual([]);

    sharedSocket.connected = true;
    await act(async () => { sharedSocket!.fire('connect'); await vi.advanceTimersByTimeAsync(0); });

    expect(emitsOf(sharedSocket, 'createGame')).toHaveLength(1);
    expect(outcomes()).toEqual([]);
  });

  it('an early tap whose socket never connects reports not_connected only after the wait', async () => {
    sharedSocket = makeSocket(false);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(null)));

    await act(async () => { void result.current(true, null, undefined, undefined, undefined, { quickPlay: true }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    expect(outcomes()).toEqual([]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });

    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'not_connected', quickPlay: true })]);
    expect(sharedSocket.listenerCount('connect')).toBe(0);
  });

  it('still reports not_connected at once when there is no socket anywhere', async () => {
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(null)));

    await act(async () => { await result.current(false); });

    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'not_connected' })]);
    expect(toastError).toHaveBeenCalledWith('common.notConnected', expect.anything());
  });

  it('a double tap during the connect wait starts one attempt, one emit, one outcome', async () => {
    const socket = makeSocket(false);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { void result.current(true); void result.current(true); });
    socket.connected = true;
    await act(async () => { socket.fire('connect'); await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { socket.fire('joined'); });

    expect(emitsOf(socket, 'createGame')).toHaveLength(1);
    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'joined' })]);
  });

  it('a rate-limited room create ends the attempt at once with a toast instead of a 10s wait', async () => {
    const socket = makeSocket(true);
    const options = makeOptions(socket);
    const { result } = renderHook(() => useMultiplayerJoin(options));

    await act(async () => { await result.current(true, null, undefined, undefined, undefined, { quickPlay: true }); });
    act(() => { socket.fire('rate-limited', { action: 'roomCreate', retryAfterMs: 8000 }); });

    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'rateLimited', reason: 'roomCreate', quickPlay: true })]);
    expect(options.setIsJoining).toHaveBeenLastCalledWith(false);
    expect(toastError).toHaveBeenCalledWith('errors.roomCreateTooSoon', expect.anything());
    expect(socket.listenerCount('joined')).toBe(0);
    expect(socket.listenerCount('rate-limited')).toBe(0);

    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    expect(outcomes()).toHaveLength(1);
    expect(eventsNamed('mp_lobby_join_timeout')).toEqual([]);
  });

  it('ignores a rate limit for another action', async () => {
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(true); });
    act(() => { socket.fire('rate-limited', { action: 'chatMessage', retryAfterMs: 1000 }); });

    expect(outcomes()).toEqual([]);
  });

  it('a retry after a failure starts clean: the old attempt cannot answer for or unlock the new one', async () => {
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(false); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_500); });
    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'timeout' })]);
    expect(socket.listenerCount('joined')).toBe(0);

    await act(async () => { await result.current(false); });
    act(() => { socket.fire('joined'); });

    expect(eventsNamed('mp_lobby_join_resolved')).toHaveLength(1);
    expect(outcomes().map((o) => o.outcome)).toEqual(['timeout', 'joined']);

    await act(async () => { await result.current(false); });
    expect(emitsOf(socket, 'join')).toHaveLength(3);
  });

  it('emits exactly one outcome per attempt when the server answers twice', async () => {
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(true); });
    act(() => { socket.fire('joined'); socket.fire('error', { code: 'X' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });

    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'joined' })]);
  });
});
