import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiplayerJoin } from './useMultiplayerJoin';
import { getRejoinIntent, clearRejoinIntent } from '../../../utils/socketRejoin';

function makeSocket() {
  return {
    connected: true,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
}

function makeOptions(socket: ReturnType<typeof makeSocket>) {
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

describe('useMultiplayerJoin in-flight guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits only once when invoked twice in rapid succession (double-submit guard)', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => {
      // Two rapid invocations (e.g. Enter key + button click) before the
      // first join resolves — must not double-emit a join to the server.
      result.current(false);
      result.current(false);
    });

    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({ gameCode: 'ABCD' }));
  });

  it('allows a fresh join after the prior attempt resolves (joined event releases the guard)', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { result.current(false); });
    expect(socket.emit).toHaveBeenCalledTimes(1);

    // Simulate the server resolving the join: fire whatever resolver the hook
    // registered on 'joined'. The hook registers via .on(...) so we can find it.
    const joinedCall = socket.on.mock.calls.find(([evt]) => evt === 'joined');
    expect(joinedCall, 'hook should register a joined listener').toBeTruthy();
    act(() => { (joinedCall![1] as () => void)(); });

    await act(async () => { result.current(false); });
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });
});

describe('useMultiplayerJoin records a rejoin intent', () => {
  beforeEach(() => { vi.clearAllMocks(); clearRejoinIntent(); });

  it('remembers the joined game so a reconnect can re-join the same room', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { result.current(false); });

    const intent = getRejoinIntent();
    expect(intent).toEqual(expect.objectContaining({ gameCode: 'ABCD' }));
    expect(intent?.username).toBeTruthy();
  });
});

describe('useMultiplayerJoin waits for auth instead of dropping the tap', () => {
  beforeEach(() => { vi.clearAllMocks(); clearRejoinIntent(); });

  it('still emits the join when auth settles shortly after the tap', async () => {
    const socket = makeSocket();
    const opts = { ...makeOptions(socket), loading: true, authLoadingStartTime: Date.now() };

    const { result, rerender } = renderHook(
      (props: ReturnType<typeof makeOptions>) => useMultiplayerJoin(props),
      { initialProps: opts },
    );

    // Tap fires while the Supabase profile is still in flight.
    let joinPromise: Promise<void> | undefined;
    await act(async () => { joinPromise = result.current(false); });

    // Nothing emitted yet — the hook is waiting, not aborting.
    expect(socket.emit).not.toHaveBeenCalled();
    // ...but the UI must already show the pending state, because the in-flight
    // guard is held for the whole wait and silently drops any second tap.
    expect(opts.setIsJoining).toHaveBeenCalledWith(true);

    // Auth resolves a moment later; the pending tap must proceed on its own.
    // Commit the settled auth BEFORE awaiting — a rerender nested inside the
    // awaiting act() would not flush until that act exits, so the join would
    // only proceed via the timeout path and this would pass for the wrong reason.
    const settledAt = Date.now();
    act(() => { rerender({ ...opts, loading: false, profile: { display_name: 'RealName' } }); });
    await act(async () => { await joinPromise; });

    expect(socket.emit).toHaveBeenCalledTimes(1);
    // Proceeded because auth settled, not because the 5s budget expired.
    expect(Date.now() - settledAt).toBeLessThan(1000);
    expect(socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({ gameCode: 'ABCD' }));
  });

  it('uses the profile that arrived during the wait, not the stale pre-tap value', async () => {
    const socket = makeSocket();
    const opts = { ...makeOptions(socket), loading: true, authLoadingStartTime: Date.now() };

    const { result, rerender } = renderHook(
      (props: ReturnType<typeof makeOptions>) => useMultiplayerJoin(props),
      { initialProps: opts },
    );

    let joinPromise: Promise<void> | undefined;
    await act(async () => { joinPromise = result.current(false); });

    // Commit the settled auth BEFORE awaiting — a rerender nested inside the
    // awaiting act() would not flush until that act exits, i.e. too late.
    act(() => { rerender({ ...opts, loading: false, profile: { display_name: 'RealName' } }); });
    await act(async () => { await joinPromise; });

    expect(socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({ username: 'RealName' }));
  });

  it('gives up and surfaces an error if auth never settles', async () => {
    vi.useFakeTimers();
    const socket = makeSocket();
    const opts = { ...makeOptions(socket), loading: true, authLoadingStartTime: Date.now() };

    const { result } = renderHook(
      (props: ReturnType<typeof makeOptions>) => useMultiplayerJoin(props),
      { initialProps: opts },
    );

    let joinPromise: Promise<void> | undefined;
    await act(async () => { joinPromise = result.current(false); });

    // Auth stays stuck for the whole budget — the hook must stop waiting and
    // proceed with what it has rather than hanging on the spinner forever.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
      await joinPromise;
    });

    expect(socket.emit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
