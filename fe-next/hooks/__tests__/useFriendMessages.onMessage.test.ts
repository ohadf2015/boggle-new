/**
 * useFriendMessages onMessage callback (N-1 live toast wiring)
 * Verifies: incoming friends:messageReceived invokes onMessage ref-stable callback
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, socketHandlers } = vi.hoisted(() => {
  const socketHandlers = new Map<string, Function>();
  const fakeSocket = {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => { socketHandlers.set(event, handler); }),
    off: vi.fn((event: string) => { socketHandlers.delete(event); }),
    once: vi.fn(),
  };
  const mockUseAuth = vi.fn(() => ({ user: { id: 'user-a' } }));
  const mockSocketCtx = vi.fn(() => ({ socket: fakeSocket, isConnected: true }));
  return { mockUseAuth, mockSocketCtx, fakeSocket, socketHandlers };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: (...a: unknown[]) => mockUseAuth(...a) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: (...a: unknown[]) => mockSocketCtx(...a) }));
vi.mock('@/utils/friendMessages', () => ({
  getThreads: vi.fn().mockResolvedValue([]),
  getConversation: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
  sendMessage: vi.fn(),
  markMessagesRead: vi.fn(),
  deleteMessage: vi.fn(),
  sendChallenge: vi.fn(),
  acceptChallenge: vi.fn(),
  declineChallenge: vi.fn(),
  getPendingChallenges: vi.fn().mockResolvedValue({ sent: [], received: [] }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { useFriendMessages } from '../useFriendMessages';

describe('useFriendMessages onMessage', () => {
  beforeEach(() => {
    socketHandlers.clear();
    vi.clearAllMocks();
  });

  it('invokes onMessage callback when friends:messageReceived arrives', async () => {
    const onMessage = vi.fn();
    renderHook(() => useFriendMessages(undefined, onMessage));

    const handler = socketHandlers.get('friends:messageReceived');
    expect(handler).toBeDefined();

    const incoming = {
      messageId: 'm1', conversationId: 'c', fromUserId: 'user-b', toUserId: 'user-a',
      message: 'hi', timestamp: Date.now(), isRead: false, isDeleted: false,
    };
    await act(async () => { handler!(incoming); });

    expect(onMessage).toHaveBeenCalledWith(incoming);
  });

  it('uses latest onMessage via ref (no stale closure on rerender)', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useFriendMessages(undefined, cb),
      { initialProps: { cb: first } },
    );
    rerender({ cb: second });

    const handler = socketHandlers.get('friends:messageReceived');
    const incoming = {
      messageId: 'm2', conversationId: 'c', fromUserId: 'user-b', toUserId: 'user-a',
      message: 'yo', timestamp: Date.now(), isRead: false, isDeleted: false,
    };
    await act(async () => { handler!(incoming); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(incoming);
  });
});
