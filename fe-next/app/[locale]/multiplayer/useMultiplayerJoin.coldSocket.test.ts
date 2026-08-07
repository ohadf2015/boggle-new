import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { useMultiplayerJoin } from './useMultiplayerJoin';

function makeSocket(connected: boolean) {
  return {
    connected,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    connect: vi.fn(),
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

const outcomesOf = (): Array<Record<string, unknown>> =>
  trackGrowthEvent.mock.calls
    .filter(([name]) => name === 'mp_join_outcome')
    .map(([, props]) => props as Record<string, unknown>);

/**
 * A cold socket used to strand the player: the button sat idle for 5s and then
 * produced a "not connected" toast, with no attempt to reopen the connection.
 * 50 such taps came from 27 people in 11 days, and 26 of those 28 people were
 * in their FIRST 24 HOURS — first-run breakage, not a veteran annoyance.
 * See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */
describe('useMultiplayerJoin — cold socket recovery', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('shows the pending state on the first tap instead of looking idle while it waits', async () => {
    const socket = makeSocket(false);
    const options = makeOptions(socket);
    const { result } = renderHook(() => useMultiplayerJoin(options));

    await act(async () => { void result.current(false); });

    // The player must see the tap register immediately, not after a 5s silence.
    expect(options.setIsJoining).toHaveBeenCalledWith(true);
  });

  it('actively reopens a disconnected socket rather than only listening for it', async () => {
    const socket = makeSocket(false);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { void result.current(false); });

    // socket.io does not redial once it has given up — ask it to.
    expect(socket.connect).toHaveBeenCalled();
  });

  it('does NOT call a join "joined" until the server actually acks it', async () => {
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(false); });

    // The request has been sent but the server has not replied. Counting this
    // as success would score silently-stalled joins as wins — the exact defect
    // mp_lobby_join_attempted has.
    expect(socket.emit).toHaveBeenCalledWith('join', expect.anything());
    expect(outcomesOf()).toEqual([]);
  });

  it('emits outcome "joined" when the server acks, so the funnel is measurable', async () => {
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(false); });
    const onJoined = socket.on.mock.calls.find(([evt]) => evt === 'joined');
    act(() => { (onJoined![1] as () => void)(); });

    expect(outcomesOf()).toEqual([expect.objectContaining({ outcome: 'joined' })]);
  });

  it('emits outcome "timeout" when the server never replies', async () => {
    vi.useFakeTimers();
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(false); });
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });

    expect(outcomesOf()).toEqual([expect.objectContaining({ outcome: 'timeout' })]);
  });

  it('emits exactly one outcome even if an ack lands after the timeout', async () => {
    vi.useFakeTimers();
    const socket = makeSocket(true);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => { await result.current(false); });
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    const onJoined = socket.on.mock.calls.find(([evt]) => evt === 'joined');
    act(() => { (onJoined![1] as () => void)(); });

    expect(outcomesOf()).toEqual([expect.objectContaining({ outcome: 'timeout' })]);
  });

  it('emits outcome "not_connected" once when the socket never comes back', async () => {
    vi.useFakeTimers();
    const socket = makeSocket(false);
    const options = makeOptions(socket);
    const { result } = renderHook(() => useMultiplayerJoin(options));

    await act(async () => {
      const pending = result.current(false);
      await vi.advanceTimersByTimeAsync(60_000);
      await pending;
    });

    expect(outcomesOf()).toEqual([expect.objectContaining({ outcome: 'not_connected' })]);
    // The failure must be loud, never a silent no-op.
    expect(options.setError).toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('join', expect.anything());
  });

  it('joins normally once a cold socket reconnects within the wait', async () => {
    vi.useFakeTimers();
    const socket = makeSocket(false);
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket)));

    await act(async () => {
      const pending = result.current(false);
      // Server comes back: flip the flag and fire whatever 'connect' handler ran.
      socket.connected = true;
      const onConnect = socket.once.mock.calls.find(([evt]) => evt === 'connect');
      (onConnect?.[1] as (() => void) | undefined)?.();
      await vi.advanceTimersByTimeAsync(1000);
      await pending;
    });

    expect(socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({ gameCode: 'ABCD' }));
    // Reconnected and the request went out — the outcome waits for the ack.
    expect(outcomesOf()).toEqual([]);
  });
});
