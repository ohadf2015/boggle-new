/**
 * React hook for Socket.IO /duel namespace connection
 *
 * Provides:
 * - Connection to /duel namespace
 * - Lobby actions (join/leave)
 * - Challenge actions (create, accept, decline, cancel)
 * - Gameplay actions (submit score)
 * - Event listeners with cleanup pattern
 *
 * Usage:
 * ```tsx
 * const { socket, isConnected, createChallenge, onChallengeReceived } = useDuelSocket();
 *
 * useEffect(() => {
 *   const cleanup = onChallengeReceived((data) => {
 *     console.log('Challenge from', data.challengerName);
 *   });
 *   return cleanup;
 * }, [onChallengeReceived]);
 * ```
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ==========================================
// Types
// ==========================================

export interface ChallengeReceivedData {
  duelId: string;
  challengerName: string;
  lessonId: string;
}

export interface LobbyUpdateData {
  availableOpponents: OpponentInfo[];
}

export interface OpponentInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface DuelAcceptedData {
  duelId: string;
  boardState: string[][];
  startedAt: string;
}

export interface DuelCompletedData {
  winnerId: string | null;
  challengerScore: number;
  opponentScore: number;
  xpAwarded: { winner: number; loser: number };
}

export interface ScoreSubmittedData {
  playerId: string;
  score: number;
  wordsValidated: number;
  wordsRejected: number;
}

export interface UseDuelSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  // Lobby
  joinLobby: (classroomId: string) => void;
  leaveLobby: (classroomId: string) => void;
  // Challenge
  createChallenge: (opponentId: string, lessonId: string, classroomId: string) => void;
  acceptChallenge: (duelId: string) => void;
  declineChallenge: (duelId: string) => void;
  cancelChallenge: (duelId: string) => void;
  // Gameplay
  submitScore: (duelId: string, wordsFound: string[]) => void;
  // Event listeners (caller provides callbacks)
  onChallengeReceived: (cb: (data: ChallengeReceivedData) => void) => () => void;
  onLobbyUpdate: (cb: (data: LobbyUpdateData) => void) => () => void;
  onDuelAccepted: (cb: (data: DuelAcceptedData) => void) => () => void;
  onDuelDeclined: (cb: (data: { duelId: string }) => void) => () => void;
  onDuelCompleted: (cb: (data: DuelCompletedData) => void) => () => void;
  onScoreSubmitted: (cb: (data: ScoreSubmittedData) => void) => () => void;
  onError: (cb: (data: { message: string }) => void) => () => void;
}

// ==========================================
// Hook Implementation
// ==========================================

export function useDuelSocket(): UseDuelSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // ==========================================
  // Connection Lifecycle
  // ==========================================

  useEffect(() => {
    // Determine base URL
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Connect to /duel namespace
    const socket = io(`${baseUrl}/duel`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Handle null socket from io()
    if (!socket) {
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    socketRef.current = socket;

    // Set initial connection state
    setIsConnected(socket.connected);

    // Connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      // Capture listeners map for cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const listeners = listenersRef.current;

      // Remove all registered listeners
      listeners.forEach((handler, event) => {
        socket.off(event, handler as any);
      });
      listeners.clear();

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ==========================================
  // Action Methods
  // ==========================================

  const joinLobby = useCallback((classroomId: string) => {
    socketRef.current?.emit('duel:join-lobby', { classroomId });
  }, []);

  const leaveLobby = useCallback((classroomId: string) => {
    socketRef.current?.emit('duel:leave-lobby', { classroomId });
  }, []);

  const createChallenge = useCallback(
    (opponentId: string, lessonId: string, classroomId: string) => {
      socketRef.current?.emit('duel:create', {
        opponentId,
        lessonId,
        classroomId,
      });
    },
    []
  );

  const acceptChallenge = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:accept', { duelId });
  }, []);

  const declineChallenge = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:decline', { duelId });
  }, []);

  const cancelChallenge = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:cancel', { duelId });
  }, []);

  const submitScore = useCallback((duelId: string, wordsFound: string[]) => {
    socketRef.current?.emit('duel:submit-score', { duelId, wordsFound });
  }, []);

  // ==========================================
  // Event Listeners
  // ==========================================

  const onChallengeReceived = useCallback(
    (cb: (data: ChallengeReceivedData) => void) => {
      const event = 'duel:challenge-received';
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, cb);
      listenersRef.current.set(event, cb);

      return () => {
        socket.off(event, cb);
        listenersRef.current.delete(event);
      };
    },
    []
  );

  const onLobbyUpdate = useCallback((cb: (data: LobbyUpdateData) => void) => {
    const event = 'duel:lobby-update';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onDuelAccepted = useCallback((cb: (data: DuelAcceptedData) => void) => {
    const event = 'duel:accepted';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onDuelDeclined = useCallback(
    (cb: (data: { duelId: string }) => void) => {
      const event = 'duel:declined';
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, cb);
      listenersRef.current.set(event, cb);

      return () => {
        socket.off(event, cb);
        listenersRef.current.delete(event);
      };
    },
    []
  );

  const onDuelCompleted = useCallback(
    (cb: (data: DuelCompletedData) => void) => {
      const event = 'duel:completed';
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, cb);
      listenersRef.current.set(event, cb);

      return () => {
        socket.off(event, cb);
        listenersRef.current.delete(event);
      };
    },
    []
  );

  const onScoreSubmitted = useCallback(
    (cb: (data: ScoreSubmittedData) => void) => {
      const event = 'duel:score-submitted';
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, cb);
      listenersRef.current.set(event, cb);

      return () => {
        socket.off(event, cb);
        listenersRef.current.delete(event);
      };
    },
    []
  );

  const onError = useCallback((cb: (data: { message: string }) => void) => {
    const event = 'duel:error';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  // ==========================================
  // Return API
  // ==========================================

  return {
    socket: socketRef.current,
    isConnected,
    // Lobby
    joinLobby,
    leaveLobby,
    // Challenge
    createChallenge,
    acceptChallenge,
    declineChallenge,
    cancelChallenge,
    // Gameplay
    submitScore,
    // Event listeners
    onChallengeReceived,
    onLobbyUpdate,
    onDuelAccepted,
    onDuelDeclined,
    onDuelCompleted,
    onScoreSubmitted,
    onError,
  };
}
