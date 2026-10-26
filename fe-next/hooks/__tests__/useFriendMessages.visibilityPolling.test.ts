/**
 * useFriendMessages — polling fallback must pause in hidden/background tabs.
 * UR audit 2026-10-26: rpc/get_friend_threads went 670/day -> 4,029/day with a
 * ~122/h floor from ONE desktop client polling every 30s around the clock,
 * because the fallback setInterval never paused while document.hidden.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, mockFriendMessages, mockLogger } = vi.hoisted(() => {
  const fakeSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
  const mockUseAuth = vi.fn(() => ({ user: { id: 'user-a' } }));
  const mockSocketCtx = vi.fn(() => ({ socket: fakeSocket, isConnected: false }));
  const mockFriendMessages = {
    getThreads: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
    sendMessage: vi.fn(),
    markMessagesRead: vi.fn(),
    deleteMessage: vi.fn(),
    sendChallenge: vi.fn(),
    acceptChallenge: vi.fn(),
    declineChallenge: vi.fn(),
    getPendingChallenges: vi.fn().mockResolvedValue({ sent: [], received: [] }),
  };
  const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  return { mockUseAuth, mockSocketCtx, fakeSocket, mockFriendMessages, mockLogger };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: (...a: unknown[]) => mockUseAuth(...a) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: (...a: unknown[]) => mockSocketCtx(...a) }));
vi.mock('@/utils/friendMessages', () => mockFriendMessages);
vi.mock('@/utils/logger', () => ({ default: mockLogger }));

import { useFriendMessages } from '../useFriendMessages';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useFriendMessages — visibility-aware polling fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
    vi.clearAllMocks();
    mockSocketCtx.mockReturnValue({ socket: fakeSocket, isConnected: false } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls threads every 30s while visible and the socket is disconnected', async () => {
    renderHook(() => useFriendMessages());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(1); // initial load

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(2);
  });

  it('does NOT poll threads while the tab is hidden, and refreshes once on return', async () => {
    renderHook(() => useFriendMessages());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(1);

    await act(async () => { setHidden(true); });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(1); // no hidden polling

    await act(async () => { setHidden(false); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(2); // catch-up on visible
  });

  it('polls the active conversation every 5s while visible, pauses while hidden', async () => {
    renderHook(() => useFriendMessages('friend-b'));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFriendMessages.getConversation).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(mockFriendMessages.getConversation).toHaveBeenCalledTimes(2);

    await act(async () => { setHidden(true); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(mockFriendMessages.getConversation).toHaveBeenCalledTimes(2); // paused

    await act(async () => { setHidden(false); });
    expect(mockFriendMessages.getConversation).toHaveBeenCalledTimes(3); // refresh on return
  });

  it('does not poll at all while the socket is connected', async () => {
    mockSocketCtx.mockReturnValue({ socket: fakeSocket, isConnected: true } as never);
    renderHook(() => useFriendMessages('friend-b'));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(1); // initial load still runs

    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(mockFriendMessages.getThreads).toHaveBeenCalledTimes(1);
    expect(mockFriendMessages.getConversation).toHaveBeenCalledTimes(1);
  });

  it('debug-logs when the friends socket stays disconnected for over 2 minutes', async () => {
    renderHook(() => useFriendMessages());
    await act(async () => { await vi.advanceTimersByTimeAsync(119_000); });
    expect(mockLogger.debug).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
