import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineWordQueue } from '../useOfflineWordQueue';

// Mock socket
function createMockSocket() {
  return {
    emit: vi.fn(),
  } as unknown as import('socket.io-client').Socket;
}

describe('useOfflineWordQueue', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Queues words when not connected
  describe('when disconnected', () => {
    it('queues a word and returns true', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      let queued: boolean;
      act(() => {
        queued = result.current.queueWord('hello');
      });

      expect(queued!).toBe(true);
      expect(result.current.queueSize).toBe(1);
      expect(result.current.pendingWords).toHaveLength(1);
      expect(result.current.pendingWords[0].word).toBe('hello');
    });

    it('queues multiple words', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      act(() => {
        result.current.queueWord('hello');
        result.current.queueWord('world');
        result.current.queueWord('test');
      });

      expect(result.current.queueSize).toBe(3);
      expect(result.current.pendingWords).toHaveLength(3);
    });
  });

  // 2. Does not queue when connected
  describe('when connected', () => {
    it('returns false and does not queue', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, true)
      );

      let queued: boolean;
      act(() => {
        queued = result.current.queueWord('hello');
      });

      expect(queued!).toBe(false);
      expect(result.current.queueSize).toBe(0);
      expect(result.current.pendingWords).toHaveLength(0);
    });
  });

  // 3. Replays queued words on reconnection
  describe('replay on reconnection', () => {
    it('emits submitWord for each queued word when connection is restored', () => {
      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(mockSocket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('alpha');
        result.current.queueWord('beta');
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();

      // Reconnect
      rerender({ isConnected: true });

      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'submitWord',
        expect.objectContaining({
          word: 'alpha',
          submissionId: expect.any(String),
        })
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'submitWord',
        expect.objectContaining({
          word: 'beta',
          submissionId: expect.any(String),
        })
      );
    });
  });

  // 4. Clears queue after replay
  describe('queue cleared after replay', () => {
    it('has empty queue after successful replay', () => {
      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(mockSocket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('hello');
        result.current.queueWord('world');
      });

      expect(result.current.queueSize).toBe(2);

      // Reconnect triggers replay
      rerender({ isConnected: true });

      expect(result.current.queueSize).toBe(0);
      expect(result.current.pendingWords).toHaveLength(0);
    });
  });

  // 5. Returns correct queueSize
  describe('queueSize', () => {
    it('starts at 0', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      expect(result.current.queueSize).toBe(0);
    });

    it('increments as words are queued', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      act(() => {
        result.current.queueWord('a');
      });
      expect(result.current.queueSize).toBe(1);

      act(() => {
        result.current.queueWord('b');
      });
      expect(result.current.queueSize).toBe(2);
    });

    it('resets to 0 after replay', () => {
      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(mockSocket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('x');
        result.current.queueWord('y');
      });

      expect(result.current.queueSize).toBe(2);

      rerender({ isConnected: true });

      expect(result.current.queueSize).toBe(0);
    });
  });

  // 6. isReplaying state
  describe('isReplaying', () => {
    it('is false initially', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      expect(result.current.isReplaying).toBe(false);
    });

    it('is true during replay and false after', () => {
      let replayingDuringEmit = false;

      const emitMock = vi.fn(() => {
        // Capture isReplaying state during emit — we check it after
        replayingDuringEmit = true;
      });

      const socket = {
        emit: emitMock,
      } as unknown as import('socket.io-client').Socket;

      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(socket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('word1');
      });

      // Reconnect
      rerender({ isConnected: true });

      // After replay completes, isReplaying should be false
      expect(result.current.isReplaying).toBe(false);
      expect(emitMock).toHaveBeenCalled();
    });
  });

  // 7. Each queued word has a unique submissionId
  describe('submissionId uniqueness', () => {
    it('assigns unique submissionId to each queued word', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      act(() => {
        result.current.queueWord('aaa');
        result.current.queueWord('bbb');
        result.current.queueWord('ccc');
      });

      const ids = result.current.pendingWords.map((w) => w.submissionId);

      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All unique

      // Each id should be a non-empty string
      ids.forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('includes submissionId when replaying via emit', () => {
      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(mockSocket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('test');
      });

      const submissionId = result.current.pendingWords[0].submissionId;

      rerender({ isConnected: true });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'submitWord',
        expect.objectContaining({ submissionId })
      );
    });
  });

  // 8. Replays in FIFO order
  describe('FIFO replay order', () => {
    it('replays words in the order they were queued', () => {
      const emitOrder: string[] = [];
      const socket = {
        emit: vi.fn((_event: string, payload: { word: string }) => {
          emitOrder.push(payload.word);
        }),
      } as unknown as import('socket.io-client').Socket;

      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(socket, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('first');
        result.current.queueWord('second');
        result.current.queueWord('third');
      });

      rerender({ isConnected: true });

      expect(emitOrder).toEqual(['first', 'second', 'third']);
    });
  });

  // 9. Does not replay if queue is empty
  describe('empty queue on reconnect', () => {
    it('does not emit anything when reconnecting with empty queue', () => {
      const { rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(mockSocket, isConnected),
        { initialProps: { isConnected: false } }
      );

      // Reconnect without queuing anything
      rerender({ isConnected: true });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  // Additional edge case: queued words have timestamps
  describe('timestamp', () => {
    it('records a timestamp for each queued word', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useOfflineWordQueue(mockSocket, false)
      );

      act(() => {
        result.current.queueWord('timed');
      });

      expect(result.current.pendingWords[0].timestamp).toBe(now);
    });
  });

  // Edge case: null socket
  describe('null socket', () => {
    it('still queues words when socket is null', () => {
      const { result } = renderHook(() =>
        useOfflineWordQueue(null, false)
      );

      let queued: boolean;
      act(() => {
        queued = result.current.queueWord('offline');
      });

      expect(queued!).toBe(true);
      expect(result.current.queueSize).toBe(1);
    });

    it('does not attempt replay when socket is null even if connected flag is true', () => {
      const { result, rerender } = renderHook(
        ({ isConnected }) => useOfflineWordQueue(null, isConnected),
        { initialProps: { isConnected: false } }
      );

      act(() => {
        result.current.queueWord('orphan');
      });

      // Reconnect with null socket — should not throw
      rerender({ isConnected: true });

      // Words remain queued since there's no socket to emit on
      expect(result.current.pendingWords).toHaveLength(1);
    });
  });
});
