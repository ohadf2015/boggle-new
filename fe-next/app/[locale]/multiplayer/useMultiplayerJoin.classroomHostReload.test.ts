import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { useMultiplayerJoin } from './useMultiplayerJoin';
import { clearHostCreateRefusal, getHostCreateRefusal } from './hostCreateRefusal';

type Handler = (payload?: unknown) => void;

function makeSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    connected: true,
    emit: vi.fn(),
    on: vi.fn((ev: string, fn: Handler) => { (handlers[ev] ||= []).push(fn); }),
    off: vi.fn((ev: string, fn: Handler) => { handlers[ev] = (handlers[ev] || []).filter((h) => h !== fn); }),
    once: vi.fn(),
    connect: vi.fn(),
    fire: (ev: string, payload?: unknown) => (handlers[ev] || []).slice().forEach((fn) => fn(payload)),
  };
}

function makeOptions(socket: ReturnType<typeof makeSocket>, user: { id: string } | null) {
  return {
    socket: socket as never,
    gameCode: 'CLS123',
    username: 'Ms. Levi',
    roomName: 'Room',
    hostUsername: 'Ms. Levi',
    language: 'en' as const,
    t: (k: string) => k,
    isSupabaseEnabled: true,
    user,
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

const CLASSROOM_HOST = { isPrivate: true, isClassroom: true };
const creates = (socket: ReturnType<typeof makeSocket>) => socket.emit.mock.calls.filter(([ev]) => ev === 'createGame');

describe('classroom host reload: no create before sign-in resolves, and a refusal never spins', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearHostCreateRefusal();
  });
  afterEach(() => vi.useRealTimers());

  it('waits for the signed-in user before creating, then sends their id', async () => {
    const socket = makeSocket();
    const { result, rerender } = renderHook(({ user }) => useMultiplayerJoin(makeOptions(socket, user) as never), {
      initialProps: { user: null as { id: string } | null },
    });

    await act(async () => { void result.current(true, 'en', 'CLS123', 'Room', 'Ms. Levi', CLASSROOM_HOST); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(creates(socket)).toHaveLength(0);

    rerender({ user: { id: 'teacher-1' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });

    expect(creates(socket)).toHaveLength(1);
    expect(creates(socket)[0][1]).toMatchObject({ gameCode: 'CLS123', authUserId: 'teacher-1', isClassroom: true });
  });

  it('never creates a classroom room signed out, and leaves a refusal the entry can retry from', async () => {
    const socket = makeSocket();
    const options = makeOptions(socket, null);
    const { result } = renderHook(() => useMultiplayerJoin(options as never));

    await act(async () => { void result.current(true, 'en', 'CLS123', 'Room', 'Ms. Levi', CLASSROOM_HOST); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });

    expect(creates(socket)).toHaveLength(0);
    expect(options.setIsJoining).toHaveBeenLastCalledWith(false);
    expect(getHostCreateRefusal()).toEqual({ code: 'CLS123', reason: 'AUTH_REQUIRED' });
  });

  it('a rate-limited classroom create also ends on the retry screen, not the spinner', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket, { id: 'teacher-1' }) as never));

    await act(async () => { void result.current(true, 'en', 'CLS123', 'Room', 'Ms. Levi', CLASSROOM_HOST); });
    await act(async () => { socket.fire('rate-limited', { action: 'roomCreate' }); });

    expect(getHostCreateRefusal()).toEqual({ code: 'CLS123', reason: 'roomCreate' });
  });

  it('keeps the server refusal for the entry screen, and a new attempt starts clean', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket, { id: 'teacher-2' }) as never));

    await act(async () => { void result.current(true, 'en', 'CLS123', 'Room', 'Ms. Levi', CLASSROOM_HOST); });
    await act(async () => { socket.fire('error', { code: 'GAME_ALREADY_EXISTS', message: 'Game code already in use' }); });
    expect(getHostCreateRefusal()).toEqual({ code: 'CLS123', reason: 'GAME_ALREADY_EXISTS' });

    await act(async () => { void result.current(true, 'en', 'CLS123', 'Room', 'Ms. Levi', CLASSROOM_HOST); });
    expect(getHostCreateRefusal()).toBeNull();
    await act(async () => { socket.fire('joined', { gameCode: 'CLS123', isHost: true }); });
    expect(getHostCreateRefusal()).toBeNull();
  });

  it('a public host is not held for sign-in and records no refusal', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(makeOptions(socket, null) as never));

    await act(async () => { void result.current(true, 'en', 'PUB123', 'Room', 'Guest'); });
    await act(async () => { socket.fire('error', { code: 'GAME_ALREADY_EXISTS' }); });

    expect(creates(socket)).toHaveLength(1);
    expect(getHostCreateRefusal()).toBeNull();
  });
});
