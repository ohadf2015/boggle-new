import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { useMultiplayerJoin } from './useMultiplayerJoin';

function makeSocket() {
  return { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn(), once: vi.fn(), connect: vi.fn() };
}

const options = (socket: ReturnType<typeof makeSocket>) => ({
  socket: socket as never,
  gameCode: 'ABCD12',
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

const createPayload = (socket: ReturnType<typeof makeSocket>) =>
  socket.emit.mock.calls.find(([ev]) => ev === 'createGame')?.[1] as Record<string, unknown> | undefined;

/** The 1v1 duo bot only joins rooms Quick Play made, so the server must be told. */
describe('useMultiplayerJoin — Quick Play rooms say so on createGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks a room Quick Play creates', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(options(socket) as never));
    await act(async () => { await result.current(true, 'en', 'ABCD12', 'Room', 'Tester', { quickPlay: true }); });
    expect(createPayload(socket)).toMatchObject({ gameCode: 'ABCD12', isQuickPlay: true });
  });

  it('leaves a Create Room room unmarked', async () => {
    const socket = makeSocket();
    const { result } = renderHook(() => useMultiplayerJoin(options(socket) as never));
    await act(async () => { await result.current(true, 'en', 'ABCD12', 'Room', 'Tester'); });
    expect(createPayload(socket)).toBeDefined();
    expect(createPayload(socket)).not.toHaveProperty('isQuickPlay');
  });
});
