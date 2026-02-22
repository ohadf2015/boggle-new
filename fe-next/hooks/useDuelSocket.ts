/**
 * React hook for Socket.IO /duel namespace connection
 *
 * Provides:
 * - Connection to /duel namespace
 * - Lobby actions (join/leave)
 * - Challenge actions (create, accept, decline, cancel)
 * - Gameplay actions (submit score, submit word)
 * - Real-time actions (forfeit, sync state)
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
import { useAuth } from '@/contexts/AuthContext';
import type {
  UseDuelSocketReturn,
  ChallengeReceivedData,
  LobbyUpdateData,
  DuelAcceptedData,
  DuelCompletedData,
  ScoreSubmittedData,
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  OpponentReconnectedData,
  StateSyncedData,
} from './useDuelSocket.types';

// Re-export types for consumer convenience
export type {
  UseDuelSocketReturn,
  ChallengeReceivedData,
  LobbyUpdateData,
  OpponentInfo,
  DuelAcceptedData,
  DuelCompletedData,
  ScoreSubmittedData,
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  OpponentReconnectedData,
  StateSyncedData,
} from './useDuelSocket.types';

// ==========================================
// Hook Implementation
// ==========================================

export function useDuelSocket(): UseDuelSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Function>>(new Map());
  const { user, profile } = useAuth();

  // ==========================================
  // Connection Lifecycle
  // ==========================================

  useEffect(() => {
    // Determine base URL
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Build display name from profile or fall back to email prefix
    const displayName =
      profile?.display_name ||
      profile?.username ||
      user?.email?.split('@')[0] ||
      'Anonymous';

    // Connect to /duel namespace with user credentials in handshake auth
    // so server middleware can set socket.data.userId / socket.data.displayName
    const socket = io(`${baseUrl}/duel`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        userId: user?.id || '',
        displayName,
      },
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
    // Re-connect when the user id changes (e.g. user logs in after mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    (opponentId: string, lessonId: string, classroomId: string, duelType: 'async' | 'realtime' = 'async') => {
      socketRef.current?.emit('duel:create', {
        opponentId,
        lessonId,
        classroomId,
        duelType,
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

  const submitWord = useCallback((duelId: string, word: string, positions?: number[]) => {
    socketRef.current?.emit('duel:submit-word', { duelId, word, positions });
  }, []);

  const forfeitDuel = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:forfeit', { duelId });
  }, []);

  const syncState = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:sync-state', { duelId });
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

  const onDuelStarted = useCallback((cb: (data: DuelStartedData) => void) => {
    const event = 'duel:started';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onWordAccepted = useCallback((cb: (data: WordAcceptedData) => void) => {
    const event = 'duel:word-accepted';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onWordRejected = useCallback((cb: (data: WordRejectedData) => void) => {
    const event = 'duel:word-rejected';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onOpponentProgress = useCallback((cb: (data: OpponentProgressData) => void) => {
    const event = 'duel:opponent-progress';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onOpponentDisconnected = useCallback((cb: (data: OpponentDisconnectedData) => void) => {
    const event = 'duel:opponent-disconnected';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onOpponentReconnected = useCallback((cb: (data: OpponentReconnectedData) => void) => {
    const event = 'duel:opponent-reconnected';
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, cb);
    listenersRef.current.set(event, cb);

    return () => {
      socket.off(event, cb);
      listenersRef.current.delete(event);
    };
  }, []);

  const onStateSynced = useCallback((cb: (data: StateSyncedData) => void) => {
    const event = 'duel:state-synced';
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
    // Real-time actions
    submitWord,
    forfeitDuel,
    syncState,
    // Event listeners
    onChallengeReceived,
    onLobbyUpdate,
    onDuelAccepted,
    onDuelDeclined,
    onDuelCompleted,
    onScoreSubmitted,
    onError,
    // Real-time event listeners
    onDuelStarted,
    onWordAccepted,
    onWordRejected,
    onOpponentProgress,
    onOpponentDisconnected,
    onOpponentReconnected,
    onStateSynced,
  };
}
