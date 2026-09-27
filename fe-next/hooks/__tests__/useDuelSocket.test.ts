/**
 * Tests for useDuelSocket hook
 *
 * Test pattern: Mock socket.io-client, verify connect/disconnect lifecycle,
 * verify action methods emit correct events, verify on* methods register/unregister listeners
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { io, Socket } from 'socket.io-client';
import { useDuelSocket } from '../useDuelSocket';

// Mock socket.io-client
vi.mock('socket.io-client');

// Mock @/lib/supabase so auth callback can resolve a JWT
vi.mock('@/lib/supabase', () => ({
  getSession: vi.fn().mockResolvedValue({
    data: { session: { access_token: 'test-jwt-token' } },
  }),
}));

describe('useDuelSocket', () => {
  let mockSocket: any;
  let mockIo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock socket instance
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
    };

    // Mock io() to return our mock socket
    mockIo = io as any;
    mockIo.mockReturnValue(mockSocket as Socket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Connection Lifecycle Tests
  // ==========================================

  describe('Connection Lifecycle', () => {
    it('should connect to /duel namespace on mount', () => {
      renderHook(() => useDuelSocket());

      expect(mockIo).toHaveBeenCalledWith(
        expect.stringContaining('/duel'),
        expect.any(Object)
      );
    });

    it('should pass a Supabase JWT in the auth handshake', async () => {
      renderHook(() => useDuelSocket());

      const opts = mockIo.mock.calls[0][1] as { auth: unknown };
      expect(typeof opts.auth).toBe('function');

      const cb = vi.fn();
      (opts.auth as (cb: (p: unknown) => void) => void)(cb);
      await waitFor(() => expect(cb).toHaveBeenCalled());

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'test-jwt-token' })
      );
    });

    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useDuelSocket());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should return isConnected = true when socket is connected', () => {
      mockSocket.connected = true;
      const { result } = renderHook(() => useDuelSocket());

      expect(result.current.isConnected).toBe(true);
    });

    it('should return isConnected = false when socket is disconnected', () => {
      mockSocket.connected = false;
      const { result } = renderHook(() => useDuelSocket());

      expect(result.current.isConnected).toBe(false);
    });

    it('should update isConnected on connect event', () => {
      mockSocket.connected = false;
      const { result, rerender } = renderHook(() => useDuelSocket());

      // Simulate connect event
      act(() => {
        const connectHandler = (mockSocket.on as any).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          connectHandler();
        }
      });

      rerender();

      expect(result.current.isConnected).toBe(true);
    });
  });

  // ==========================================
  // Action Methods Tests
  // ==========================================

  describe('Action Methods', () => {
    it('should emit duel:join-lobby with classroomId', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.joinLobby('classroom-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:join-lobby', {
        classroomId: 'classroom-123',
      });
    });

    it('should emit duel:leave-lobby with classroomId', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.leaveLobby('classroom-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:leave-lobby', {
        classroomId: 'classroom-123',
      });
    });

    it('should emit duel:create with correct payload', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.createChallenge(
          'opponent-id',
          'lesson-id',
          'classroom-id'
        );
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:create', {
        opponentId: 'opponent-id',
        lessonId: 'lesson-id',
        classroomId: 'classroom-id',
        duelType: 'async',
      });
    });

    it('should emit duel:accept with duelId', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.acceptChallenge('duel-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:accept', {
        duelId: 'duel-123',
      });
    });

    it('should emit duel:decline with duelId', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.declineChallenge('duel-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:decline', {
        duelId: 'duel-123',
      });
    });

    it('should emit duel:cancel with duelId', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.cancelChallenge('duel-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:cancel', {
        duelId: 'duel-123',
      });
    });

    it('should emit duel:submit-score with correct payload', () => {
      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.submitScore('duel-123', ['word1', 'word2']);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:submit-score', {
        duelId: 'duel-123',
        wordsFound: ['word1', 'word2'],
      });
    });
  });

  // ==========================================
  // Event Listener Tests
  // ==========================================

  describe('Event Listeners', () => {
    it('should register onChallengeReceived listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onChallengeReceived(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:challenge-received',
        expect.any(Function)
      );
    });

    it('should call callback when challenge received', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onChallengeReceived(callback);
      });

      // Find and call the registered handler
      const handler = (mockSocket.on as any).mock.calls.find(
        (call) => call[0] === 'duel:challenge-received'
      )?.[1];

      const testData = {
        duelId: 'duel-123',
        challengerName: 'John',
        lessonId: 'lesson-123',
      };

      act(() => {
        handler?.(testData);
      });

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should unregister onChallengeReceived when cleanup function called', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.onChallengeReceived(callback);
      });

      act(() => {
        cleanup?.();
      });

      expect(mockSocket.off).toHaveBeenCalledWith(
        'duel:challenge-received',
        expect.any(Function)
      );
    });

    it('should register onLobbyUpdate listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onLobbyUpdate(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:lobby-update',
        expect.any(Function)
      );
    });

    it('should register onDuelAccepted listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onDuelAccepted(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:accepted',
        expect.any(Function)
      );
    });

    it('should register onDuelDeclined listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onDuelDeclined(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:declined',
        expect.any(Function)
      );
    });

    it('should register onDuelCompleted listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onDuelCompleted(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:completed',
        expect.any(Function)
      );
    });

    it('should register onScoreSubmitted listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onScoreSubmitted(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:score-submitted',
        expect.any(Function)
      );
    });

    it('should register onError listener', () => {
      const { result } = renderHook(() => useDuelSocket());
      const callback = vi.fn();

      act(() => {
        result.current.onError(callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:error',
        expect.any(Function)
      );
    });

    it('should unregister all listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useDuelSocket());

      // Register some listeners
      act(() => {
        result.current.onChallengeReceived(vi.fn());
        result.current.onLobbyUpdate(vi.fn());
        result.current.onError(vi.fn());
      });

      // Clear mock calls from registration
      (mockSocket.off as any).mockClear();

      unmount();

      // Should call off() for each registered listener
      expect(mockSocket.off).toHaveBeenCalledWith(
        'duel:challenge-received',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'duel:lobby-update',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'duel:error',
        expect.any(Function)
      );
    });
  });

  // ==========================================
  // Edge Cases
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle null socket gracefully', () => {
      mockIo.mockReturnValue(null as unknown as Socket);

      const { result } = renderHook(() => useDuelSocket());

      expect(result.current.socket).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it('should not emit events when socket is null', () => {
      mockIo.mockReturnValue(null as unknown as Socket);

      const { result } = renderHook(() => useDuelSocket());

      act(() => {
        result.current.joinLobby('classroom-123');
      });

      // Should not throw, and emit was never called
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle reconnection', async () => {
      const { result } = renderHook(() => useDuelSocket());

      // Initially connected
      expect(result.current.isConnected).toBe(true);

      // Simulate disconnect
      act(() => {
        mockSocket.connected = false;
        const disconnectHandler = (mockSocket.on as any).mock.calls.find(
          (call) => call[0] === 'disconnect'
        )?.[1];
        disconnectHandler?.();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Simulate reconnect
      act(() => {
        mockSocket.connected = true;
        const connectHandler = (mockSocket.on as any).mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });
});
