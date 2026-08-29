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
    on: vi.fn((ev: string, fn: Handler) => {
      (handlers[ev] ||= []).push(fn);
    }),
    off: vi.fn(),
    once: vi.fn(),
    connect: vi.fn(),
    /** Drive the server's reply the way socket.io would. */
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

const outcomesOf = (): Array<Record<string, unknown>> =>
  trackGrowthEvent.mock.calls
    .filter(([name]) => name === 'mp_join_outcome')
    .map(([, props]) => props as Record<string, unknown>);

/**
 * Failed joins must say WHY.
 *
 * PostHog, since the 2026-07-27 era boundary: `mp_join_outcome` recorded 291
 * `outcome:'error'` events from just 58 people — about five failed attempts each,
 * so these are players hammering the button, not incidental blips. Every one of
 * those 291 events carries NO diagnostic property: no reason, no code, no message.
 * `onError` discarded the server's error payload before the event was emitted, so
 * the single biggest join failure bucket is unattributable and cannot be fixed.
 *
 * That is Class 4 (silent failure) from .claude/rules/60-recurring-pitfalls.md,
 * living inside the telemetry that was supposed to detect Class 4.
 */
describe('useMultiplayerJoin — failed joins are diagnosable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records the server reason on a failed join', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false);
    });
    await act(async () => {
      socket.fire('error', { message: 'Game code already exists' });
    });

    const errors = outcomesOf().filter((o) => o.outcome === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe('Game code already exists');
  });

  // The server sends both, e.g. { code: 'GAME_NOT_FOUND', message: 'Game not found' }.
  // The code is the groupable one: bounded set, stable across copy and i18n edits,
  // and it cannot interpolate a room code or username into an analytics property.
  it('prefers the error code over the human-readable message', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false);
    });
    await act(async () => {
      socket.fire('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
    });

    expect(outcomesOf().find((o) => o.outcome === 'error')?.reason).toBe('GAME_NOT_FOUND');
  });

  it('accepts a bare string error payload', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false);
    });
    await act(async () => {
      socket.fire('error', 'Room is full');
    });

    expect(outcomesOf().find((o) => o.outcome === 'error')?.reason).toBe('Room is full');
  });

  it('still records a reason when the server sends nothing at all', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false);
    });
    await act(async () => {
      socket.fire('error');
    });

    // "unknown" is still a fact — it tells us the SERVER is emitting a bare
    // error, which is a different bug from the client dropping the payload.
    // An absent property cannot distinguish those two.
    expect(outcomesOf().find((o) => o.outcome === 'error')?.reason).toBe('unknown');
  });

  it('leaves successful joins unannotated', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket) as never));

    await act(async () => {
      void result.current(false);
    });
    await act(async () => {
      socket.fire('joined', { success: true });
    });

    const joined = outcomesOf().find((o) => o.outcome === 'joined');
    expect(joined).toBeDefined();
    expect(joined?.reason).toBeUndefined();
  });
});
