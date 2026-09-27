import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { useMultiplayerJoin } from './useMultiplayerJoin';

type Handler = (payload?: unknown) => void;

function makeSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    connected: true,
    emit: vi.fn(),
    on: vi.fn((ev: string, fn: Handler) => { (handlers[ev] ||= []).push(fn); }),
    off: vi.fn(),
    once: vi.fn(),
    connect: vi.fn(),
    fire: (ev: string, payload?: unknown) => (handlers[ev] || []).forEach((fn) => fn(payload)),
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

const namesOf = (name: string) =>
  trackGrowthEvent.mock.calls.filter(([n]) => n === name);

/**
 * Quick Play's "joined" event must follow the INTENT, not the URL.
 *
 * `mp_quickplay_joined` was emitted from PageClient gated on
 * `searchParams.get('quickPlay') === 'true'`, so it could only ever fire for the
 * landing auto-fire path. `mp_quickplay_initiated` fires inside `handleQuickPlay()`,
 * which ALSO runs for the in-lobby "Quick Start" button — where there is no such
 * query param. Every lobby Quick Start tap therefore counted as an initiation that
 * could never convert.
 *
 * Measured over PostHog since the 2026-07-27 era boundary:
 *   initiated, url has quickPlay param : 355 events / 168 users
 *   initiated, no param                : 303 events / 198 users
 *   joined,    url has quickPlay param : 475 events / 162 users
 *   joined,    no param                :   0 events /   0 users   <- zero, ever
 *
 * That produced a fake "53% of Quick Play users abandon". Restricted to the entry
 * path that can actually report, real conversion is 162/168 = 96.4%. The funnel was
 * broken, not the feature — the same shape as `mp_lobby_join_attempted` being a
 * failure counter. Emitting from the join hook, where `options.quickPlay` states the
 * intent, makes both entry paths report identically.
 */
describe('useMultiplayerJoin — Quick Play conversion is measurable from any entry point', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits mp_quickplay_joined on a successful quick-play join', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false, null, 'ABCD', undefined, 'Tester', { quickPlay: true });
    });
    await act(async () => { socket.fire('joined', { success: true, isHost: false }); });

    expect(namesOf('mp_quickplay_joined')).toHaveLength(1);
  });

  it('does not emit it for an ordinary, non-quick-play join', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => { void result.current(false); });
    await act(async () => { socket.fire('joined', { success: true }); });

    expect(namesOf('mp_quickplay_joined')).toHaveLength(0);
  });

  it('does not report a failed quick-play attempt as joined', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false, null, 'ABCD', undefined, 'Tester', { quickPlay: true });
    });
    await act(async () => { socket.fire('error', { code: 'GAME_NOT_FOUND' }); });

    expect(namesOf('mp_quickplay_joined')).toHaveLength(0);
  });

  it('emits exactly once even if the server answers twice', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false, null, 'ABCD', undefined, 'Tester', { quickPlay: true });
    });
    await act(async () => {
      socket.fire('joined', { success: true });
      socket.fire('joined', { success: true });
    });

    expect(namesOf('mp_quickplay_joined')).toHaveLength(1);
  });
});
