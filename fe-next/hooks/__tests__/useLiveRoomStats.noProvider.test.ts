import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLiveRoomStats } from '../useLiveRoomStats';

// Homepage has NO SocketProvider → useSocketOptional() returns null.
// The hook must NOT sit in a loading state for 3s waiting for a socket
// that can never connect — it should resolve immediately.
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => null,
}));

describe('useLiveRoomStats — no SocketProvider (landing page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves loading=false immediately when there is no socket provider (no 3s stall)', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    // Without advancing any timers: not loading. No provider = no live source.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.openRooms).toBe(0);
    expect(result.current.totalPlayers).toBe(0);
    expect(result.current.activePlayers).toBe(0);
  });
});
