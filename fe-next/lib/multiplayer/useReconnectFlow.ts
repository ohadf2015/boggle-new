'use client';

import { useEffect, useRef, useState } from 'react';
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
  lastServerSeq: number;
  triggerAbort: () => void;
  dismissAbortModal: () => void;
}

export function useReconnectFlow({
  gameCode,
  username,
  gameActive,
}: ReconnectFlowOptions): ReconnectFlowApi {
  const { socket, isReconnecting, getReconnectAttempt, maxReconnectAttempts, isServerUpdating } =
    useSocket();
  const [showAbortModal, setShowAbortModal] = useState(false);
  const [lastServerSeq, setLastServerSeq] = useState(0);
  const wasDisconnectedWhileActive = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      if (gameActive) {
        wasDisconnectedWhileActive.current = true;
      }
    };

    const handleConnect = () => {
      if (wasDisconnectedWhileActive.current) {
        wasDisconnectedWhileActive.current = false;
        socket.emit('resume', { gameCode, username, lastServerSeq });
      }
    };

    const handleReconnectFailed = () => {
      setShowAbortModal(true);
    };

    const handleScoreUpdate = (data: { serverSeq?: number }) => {
      if (typeof data.serverSeq === 'number') {
        setLastServerSeq(data.serverSeq);
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('scoreUpdate', handleScoreUpdate);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      socket.off('reconnect_failed', handleReconnectFailed);
      socket.off('scoreUpdate', handleScoreUpdate);
    };
  }, [socket, gameCode, username, gameActive, lastServerSeq]);

  const triggerAbort = () => setShowAbortModal(true);
  const dismissAbortModal = () => setShowAbortModal(false);

  return {
    isReconnecting,
    reconnectAttempt: getReconnectAttempt(),
    maxReconnectAttempts,
    isServerUpdating: isServerUpdating ?? false,
    showAbortModal,
    lastServerSeq,
    triggerAbort,
    dismissAbortModal,
  };
}
