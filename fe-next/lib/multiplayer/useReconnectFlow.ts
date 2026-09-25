'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/utils/SocketContext';

export interface ReconnectFlowOptions {
  gameCode: string;
  username: string;
  gameActive: boolean;
}

export interface ReconnectFlowApi {
  isReconnecting: boolean;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  /** True during a planned server restart (deploy) — drives a calm, non-blocking
   *  reconnect banner instead of the full-screen "you went offline" modal. */
  isServerUpdating: boolean;
  showAbortModal: boolean;
  triggerAbort: () => void;
  dismissAbortModal: () => void;
}

/**
 * In-game reconnect UI state. State restoration itself is NOT done here: the
 * socket's `connect` handler (hooks/useMultiplayerSocket.ts onConnect) re-emits
 * `join`, and the server answers with `joined{reconnected}` + `startGame{reconnect}`
 * + `updateLeaderboard`. (A `resume` emit used to live here; no server ever
 * listened to it.)
 */
export function useReconnectFlow(_options: ReconnectFlowOptions): ReconnectFlowApi {
  const { socket, isReconnecting, getReconnectAttempt, maxReconnectAttempts, isServerUpdating } =
    useSocket();
  const [showAbortModal, setShowAbortModal] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleReconnectFailed = () => setShowAbortModal(true);
    socket.on('reconnect_failed', handleReconnectFailed);
    return () => {
      socket.off('reconnect_failed', handleReconnectFailed);
    };
  }, [socket]);

  const triggerAbort = () => setShowAbortModal(true);
  const dismissAbortModal = () => setShowAbortModal(false);

  return {
    isReconnecting,
    reconnectAttempt: getReconnectAttempt(),
    maxReconnectAttempts,
    isServerUpdating: isServerUpdating ?? false,
    showAbortModal,
    triggerAbort,
    dismissAbortModal,
  };
}
