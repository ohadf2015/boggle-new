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

const options = (socket: ReturnType<typeof makeSocket>) => ({
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
});

const outcomes = () =>
  trackGrowthEvent.mock.calls.filter(([name]) => name === 'mp_join_outcome').map(([, p]) => p as Record<string, unknown>);

/**
 * A student waiting on a closed class re-asks every 8s (useClassroomRoomWait).
 * Those re-asks logged as join failures: 268 CLASSROOM_NOT_OPEN "errors" from
 * 10 students in 28 days read as children hammering a broken button. Tagging
 * them lets funnels drop the automatic ones.
 */
describe('useMultiplayerJoin — automatic classroom re-asks are tagged', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps autoRetry on the outcome of an automatic re-join', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(options(socket) as never));

    await act(async () => { void result.current(false, null, 'ABCD', undefined, 'Tester', { autoRetry: true }); });
    await act(async () => { socket.fire('error', { code: 'CLASSROOM_NOT_OPEN', message: 'Class not open' }); });

    expect(outcomes()).toEqual([expect.objectContaining({ outcome: 'error', reason: 'CLASSROOM_NOT_OPEN', autoRetry: true })]);
  });

  it('leaves a tapped join untagged', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(options(socket) as never));

    await act(async () => { void result.current(false); });
    await act(async () => { socket.fire('error', { code: 'CLASSROOM_NOT_OPEN', message: 'Class not open' }); });

    expect(outcomes()[0]).not.toHaveProperty('autoRetry');
  });
});
