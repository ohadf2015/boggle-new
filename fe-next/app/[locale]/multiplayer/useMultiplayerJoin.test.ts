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
