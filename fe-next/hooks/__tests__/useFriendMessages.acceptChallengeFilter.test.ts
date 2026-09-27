/**
 * useFriendMessages.acceptChallenge — challengeId match filter (B3)
 *
 * Regression: socket.once('friends:challengeAccepted') resolved on the FIRST
 * emission of that event, regardless of which challengeId it carried. If two
 * pending challenges resolved nearly simultaneously, the awaiting acceptChallenge
 * call could resolve with the wrong roomCode, sending the user to the wrong room.
 */

import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const { mockUseAuth, mockSocketCtx, fakeSocket, socketHandlers, onceHandlers } = vi.hoisted(() => {
  const socketHandlers = new Map<string, Set<Function>>();
  const onceHandlers = new Map<string, Set<Function>>();
  const fakeSocket = {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!socketHandlers.has(event)) socketHandlers.set(event, new Set());
      socketHandlers.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler?: Function) => {
      if (handler) socketHandlers.get(event)?.delete(handler);
      else socketHandlers.delete(event);
    }),
    once: vi.fn((event: string, handler: Function) => {
      if (!onceHandlers.has(event)) onceHandlers.set(event, new Set());
      onceHandlers.get(event)!.add(handler);
    }),
  };
  const mockUseAuth = vi.fn(() => ({ user: { id: 'user-a' } }));
  const mockSocketCtx = vi.fn(() => ({ socket: fakeSocket, isConnected: true }));
  return { mockUseAuth, mockSocketCtx, fakeSocket, socketHandlers, onceHandlers };
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

function emitOn(event: string, payload: unknown) {
  socketHandlers.get(event)?.forEach((h) => h(payload));
}

describe('useFriendMessages.acceptChallenge — challengeId filter (B3)', () => {
  beforeEach(() => {
    socketHandlers.clear();
    onceHandlers.clear();
    vi.clearAllMocks();
  });

  it('ignores friends:challengeAccepted events for a different challengeId', async () => {
    const { result } = renderHook(() => useFriendMessages(undefined));

    let resolved: string | null | undefined;
    let promise: Promise<string | null>;
    await act(async () => {
      promise = result.current.acceptChallenge('challenge-A');
      promise.then((v) => { resolved = v; });
      await Promise.resolve();
    });

    // Wrong challenge resolves first — must NOT settle the awaited call.
    await act(async () => {
      emitOn('friends:challengeAccepted', { challengeId: 'challenge-B', roomCode: 'WRONG' });
      await Promise.resolve();
    });
    expect(resolved).toBeUndefined();

    // Correct challenge resolves — must settle with that roomCode.
    await act(async () => {
      emitOn('friends:challengeAccepted', { challengeId: 'challenge-A', roomCode: 'RIGHT' });
      await promise!;
    });
    expect(resolved).toBe('RIGHT');
  });

  it('resolves null on timeout when no matching event arrives', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useFriendMessages(undefined));

      let resolved: string | null | undefined;
      let promise: Promise<string | null>;
      await act(async () => {
        promise = result.current.acceptChallenge('challenge-X');
        promise.then((v) => { resolved = v; });
        await Promise.resolve();
      });

      // Fire mismatched event repeatedly — should not resolve.
      await act(async () => {
        emitOn('friends:challengeAccepted', { challengeId: 'challenge-Y', roomCode: 'NOPE' });
        await Promise.resolve();
      });
      expect(resolved).toBeUndefined();

      await act(async () => {
        vi.advanceTimersByTime(5001);
        await promise!;
      });
      expect(resolved).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
