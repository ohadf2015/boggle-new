// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiplayerJoin } from './useMultiplayerJoin';
import { getRejoinIntent, clearRejoinIntent } from '../../../utils/socketRejoin';

const getSession = vi.fn();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { getSession } }) }));

function setup(user: { id: string } | null) {
  const socket = { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn(), once: vi.fn() };
  const { result } = renderHook(() => useMultiplayerJoin({
    socket: socket as never, gameCode: 'ABCD', username: 'Dana', roomName: 'Room', hostUsername: 'Dana',
    language: 'en' as const, t: (k: string) => k, isSupabaseEnabled: true, user, profile: null, loading: false,
    authLoadingStartTime: null, guestAvatar: { emoji: '🙂', color: '#FF6B6B' },
    setGuestAvatar: vi.fn(), setUsername: vi.fn(), setError: vi.fn(), setIsJoining: vi.fn(),
  }));
  return { socket, join: () => result.current(false) };
}

const joinPayload = (socket: { emit: ReturnType<typeof vi.fn> }) =>
  socket.emit.mock.calls.find(([evt]) => evt === 'join')?.[1] as Record<string, unknown>;

describe('useMultiplayerJoin sends the login with the join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRejoinIntent();
    getSession.mockResolvedValue({ data: { session: { access_token: 'access-tok' } } });
  });

  it('Given a signed-in player, When they join, Then the join carries their access token for the server to verify', async () => {
    const { socket, join } = setup({ id: 'user-1' });
    await act(async () => { await join(); });
    expect(joinPayload(socket)).toEqual(expect.objectContaining({ authUserId: 'user-1', authToken: 'access-tok' }));
  });

  it('Given a signed-in player, When the rejoin intent is stored, Then it never keeps the token', async () => {
    const { join } = setup({ id: 'user-1' });
    await act(async () => { await join(); });
    expect(getRejoinIntent()).not.toHaveProperty('authToken');
  });

  it('Given a guest, When they join, Then no token is read or sent', async () => {
    const { socket, join } = setup(null);
    await act(async () => { await join(); });
    expect(joinPayload(socket)).not.toHaveProperty('authToken');
    expect(getSession).not.toHaveBeenCalled();
  });

  it('Given the session read fails, When a signed-in player joins, Then the join still goes out without a token', async () => {
    getSession.mockRejectedValue(new Error('storage blocked'));
    const { socket, join } = setup({ id: 'user-1' });
    await act(async () => { await join(); });
    expect(joinPayload(socket)).toEqual(expect.objectContaining({ authUserId: 'user-1' }));
    expect(joinPayload(socket)).not.toHaveProperty('authToken');
  });
});
