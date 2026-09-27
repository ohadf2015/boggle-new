'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface UseLobbyAutoStartParams {
  socket: Socket | null;
  /**
   * Called when the server-owned countdown fires (reaches zero). Only the host
   * should pass this — it kicks off the real `startGame`. Guests omit it and
   * simply render the synced countdown.
   */
  onFire?: () => void;
}

interface UseLobbyAutoStartReturn {
  /** Seconds remaining in the lobby auto-start, or null when not counting. */
  secondsLeft: number | null;
  /** Convenience flag: a countdown is currently in flight. */
  isAutoStarting: boolean;
  /** Cancel the countdown (host action) — tells the server to stop. */
  cancel: () => void;
}

/**
 * Mirrors the server-owned lobby auto-start countdown (see
 * `backend/modules/lobbyAutoStart.ts`). The server is the single clock so the
 * host and every guest render the exact same number. Shared by the host view
 * (passes `onFire` to actually start) and the player waiting view (display only).
 */
export function useLobbyAutoStart({ socket, onFire }: UseLobbyAutoStartParams): UseLobbyAutoStartReturn {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Keep the latest onFire in a ref so the effect below never re-subscribes
  // (re-subscribing on every render would drop in-flight server events).
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    if (!socket) return;

    const handleTick = (data: { secondsLeft: number }) => setSecondsLeft(data?.secondsLeft ?? null);
    const handleCancelled = () => setSecondsLeft(null);
    const handleFire = () => {
      setSecondsLeft(null);
      onFireRef.current?.();
    };
    const handleReset = () => setSecondsLeft(null);

    socket.on('lobbyAutoStartTick', handleTick);
    socket.on('lobbyAutoStartCancelled', handleCancelled);
    socket.on('lobbyAutoStartFire', handleFire);
    socket.on('resetGame', handleReset);

    return () => {
      socket.off('lobbyAutoStartTick', handleTick);
      socket.off('lobbyAutoStartCancelled', handleCancelled);
      socket.off('lobbyAutoStartFire', handleFire);
      socket.off('resetGame', handleReset);
    };
  }, [socket]);

  const cancel = useCallback(() => {
    socket?.emit('lobbyAutoStartCancel');
    setSecondsLeft(null);
  }, [socket]);

  return { secondsLeft, isAutoStarting: secondsLeft !== null, cancel };
}

export default useLobbyAutoStart;
