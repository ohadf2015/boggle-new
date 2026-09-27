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
import { getSession } from '@/lib/supabase';
import type {
  UseDuelSocketReturn,
  ChallengeReceivedData,
  LobbyUpdateData,
  DuelAcceptedData,
  DuelCompletedData,
  DuelCreatedData,
  RematchOfferedData,
  RematchPendingData,
  RematchInvitedData,
  RematchWithdrawnData,
  ScoreSubmittedData,
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  OpponentReconnectedData,
  StateSyncedData,
  TauntReceivedData,
} from './useDuelSocket.types';

// Re-export types for consumer convenience
export type {
  UseDuelSocketReturn,
  ChallengeReceivedData,
  LobbyUpdateData,
  OpponentInfo,
  DuelAcceptedData,
  DuelCompletedData,
  DuelCreatedData,
  ScoreSubmittedData,
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  OpponentReconnectedData,
  StateSyncedData,
  TauntReceivedData,
} from './useDuelSocket.types';

// ==========================================
// Hook Implementation
// ==========================================

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface UseDuelSocketOptions {
  onReconnect?: () => void;
}

export function useDuelSocket(options?: UseDuelSocketOptions): UseDuelSocketReturn & { connectionStatus: ConnectionStatus } {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  const registerListener = useCallback((event: string, cb: Function) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, cb as any);
    let set = listenersRef.current.get(event);
    if (!set) {
      set = new Set();
      listenersRef.current.set(event, set);
    }
    set.add(cb);
    return () => {
      socket.off(event, cb as any);
      const s = listenersRef.current.get(event);
      if (s) {
        s.delete(cb);
        if (s.size === 0) listenersRef.current.delete(event);
      }
    };
  }, []);
  const wasConnectedRef = useRef(false);
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
      auth: (cb: (payload: Record<string, string>) => void) => {
        getSession()
          .then(({ data }) => {
            cb({
              token: data.session?.access_token ?? '',
              userId: user?.id || '',
              displayName,
            });
          })
          .catch(() => {
            cb({ token: '', userId: user?.id || '', displayName });
          });
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
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      if (wasConnectedRef.current) {
        options?.onReconnect?.();
      }
      wasConnectedRef.current = true;
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      // Capture listeners map for cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const listeners = listenersRef.current;

      // Remove all registered listeners
      listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => socket.off(event, handler as any));
      });
      listeners.clear();

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
    // Re-connect when the user id or display name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.display_name]);

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

  /**
   * Announce this SCREEN to a duel that is already running.
   *
   * `duel:started` is emitted once, at accept time, to the `duel:<id>` room —
   * and the duel screen mounts a fresh socket that was never in it. Without
   * this emit both players wait for an opponent who is also waiting
   * (recurring-pitfalls Class 3: the accept path and the join path have to
   * agree about the room). The server replays the board, the original start
   * time and the live scores.
   */
  const joinDuelGame = useCallback((duelId: string) => {
    socketRef.current?.emit('duel:join-game', { duelId });
  }, []);

  /** Throw a mascot sticker at the other side of a duel (ids only — allowlisted server-side). */
  const sendTaunt = useCallback((duelId: string, stickerId: string) => {
    socketRef.current?.emit('duel:taunt', { duelId, stickerId });
  }, []);

  // ==========================================
  // Event Listeners
  // ==========================================

  const onChallengeReceived = useCallback(
    (cb: (data: ChallengeReceivedData) => void) => registerListener('duel:challenge-received', cb),
    [registerListener]
  );
  const onLobbyUpdate = useCallback(
    (cb: (data: LobbyUpdateData) => void) => registerListener('duel:lobby-update', cb),
    [registerListener]
  );
  const onDuelAccepted = useCallback(
    (cb: (data: DuelAcceptedData) => void) => registerListener('duel:accepted', cb),
    [registerListener]
  );
  const onDuelDeclined = useCallback(
    (cb: (data: { duelId: string }) => void) => registerListener('duel:declined', cb),
    [registerListener]
  );
  const onDuelCompleted = useCallback(
    (cb: (data: DuelCompletedData) => void) => registerListener('duel:completed', cb),
    [registerListener]
  );
  /** Where a freshly created duel (including a rematch) lives. */
  const onDuelCreated = useCallback(
    (cb: (data: DuelCreatedData) => void) => registerListener('duel:created', cb),
    [registerListener]
  );
  /**
   * The rematch handshake. A tap creates nothing: the first tap offers, the
   * second matches, and only then does `duel:created` arrive — for BOTH
   * students, with the same duel id.
   */
  const onRematchOffered = useCallback(
    (cb: (data: RematchOfferedData) => void) => registerListener('duel:rematch-offered', cb),
    [registerListener]
  );
  const onRematchPending = useCallback(
    (cb: (data: RematchPendingData) => void) => registerListener('duel:rematch-pending', cb),
    [registerListener]
  );
  const onRematchInvited = useCallback(
    (cb: (data: RematchInvitedData) => void) => registerListener('duel:rematch-invited', cb),
    [registerListener]
  );
  const onRematchWithdrawn = useCallback(
    (cb: (data: RematchWithdrawnData) => void) => registerListener('duel:rematch-withdrawn', cb),
    [registerListener]
  );
  const onScoreSubmitted = useCallback(
    (cb: (data: ScoreSubmittedData) => void) => registerListener('duel:score-submitted', cb),
    [registerListener]
  );
  const onError = useCallback(
    (cb: (data: { message: string }) => void) => registerListener('duel:error', cb),
    [registerListener]
  );
  const onDuelStarted = useCallback(
    (cb: (data: DuelStartedData) => void) => registerListener('duel:started', cb),
    [registerListener]
  );
  const onWordAccepted = useCallback(
    (cb: (data: WordAcceptedData) => void) => registerListener('duel:word-accepted', cb),
    [registerListener]
  );
  const onWordRejected = useCallback(
    (cb: (data: WordRejectedData) => void) => registerListener('duel:word-rejected', cb),
    [registerListener]
  );
  const onOpponentProgress = useCallback(
    (cb: (data: OpponentProgressData) => void) => registerListener('duel:opponent-progress', cb),
    [registerListener]
  );
  const onOpponentDisconnected = useCallback(
    (cb: (data: OpponentDisconnectedData) => void) => registerListener('duel:opponent-disconnected', cb),
    [registerListener]
  );
  const onOpponentReconnected = useCallback(
    (cb: (data: OpponentReconnectedData) => void) => registerListener('duel:opponent-reconnected', cb),
    [registerListener]
  );
  const onStateSynced = useCallback(
    (cb: (data: StateSyncedData) => void) => registerListener('duel:state-synced', cb),
    [registerListener]
  );
  const onTauntReceived = useCallback(
    (cb: (data: TauntReceivedData) => void) => registerListener('duel:taunt-received', cb),
    [registerListener]
  );

  // ==========================================
  // Return API
  // ==========================================

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
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
    sendTaunt,
    forfeitDuel,
    syncState,
    joinDuelGame,
    // Event listeners
    onChallengeReceived,
    onLobbyUpdate,
    onDuelAccepted,
    onDuelDeclined,
    onDuelCompleted,
    onDuelCreated,
    onRematchOffered,
    onRematchPending,
    onRematchInvited,
    onRematchWithdrawn,
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
    onTauntReceived,
  };
}
