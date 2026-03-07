'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface UseAutoFillBotsOptions {
  socket: Socket | null;
  enabled?: boolean;
  maxPlayers?: number;
  currentPlayerCount: number;
}

interface UseAutoFillBotsReturn {
  /** Whether auto-fill is enabled */
  autoFillEnabled: boolean;
  /** Whether auto-start is enabled */
  autoStartEnabled: boolean;
  /** Countdown seconds remaining (null when not counting) */
  countdown: number | null;
  /** Toggle auto-fill bots feature */
  toggleAutoFill: () => void;
  /** Toggle auto-start timer feature */
  toggleAutoStart: () => void;
  /** Cancel the current countdown */
  cancelAutoStart: () => void;
  /** Whether the room is ready to auto-start (enough players) */
  isReadyToAutoStart: boolean;
}

/**
 * useAutoFillBots - Hook for managing auto-fill bots and auto-start features
 *
 * Features:
 * - Auto-fill: Automatically adds bots to fill the room when enabled
 * - Auto-start: Starts a 30-second countdown after waiting, with visual feedback
 *
 * @example
 * const { autoFillEnabled, toggleAutoFill, countdown } = useAutoFillBots({
 *   socket,
 *   currentPlayerCount: players.length,
 * });
 */
export function useAutoFillBots({
  socket,
  enabled = true,
  maxPlayers = 8,
  currentPlayerCount,
}: UseAutoFillBotsOptions): UseAutoFillBotsReturn {
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartTriggeredRef = useRef(false);

  // Minimum players needed to consider auto-start
  const MIN_PLAYERS_FOR_AUTO_START = 2;
  const isReadyToAutoStart = currentPlayerCount >= MIN_PLAYERS_FOR_AUTO_START;

  // Clean up countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleAutoFillComplete = (data: { botsAdded: number }) => {
      if (process.env.NODE_ENV === 'development') console.log(`Auto-fill complete: ${data.botsAdded} bots added`);
    };

    const handleAutoStartCountdown = (data: { remaining: number }) => {
      setCountdown(data.remaining);
    };

    const handleAutoStartCancelled = () => {
      setCountdown(null);
      autoStartTriggeredRef.current = false;
    };

    const handleGameStarted = () => {
      // Game started - reset states
      setCountdown(null);
      setAutoStartEnabled(false);
      autoStartTriggeredRef.current = false;
    };

    socket.on('autoFillComplete', handleAutoFillComplete);
    socket.on('autoStartCountdown', handleAutoStartCountdown);
    socket.on('autoStartCancelled', handleAutoStartCancelled);
    socket.on('gameStart', handleGameStarted);

    return () => {
      socket.off('autoFillComplete', handleAutoFillComplete);
      socket.off('autoStartCountdown', handleAutoStartCountdown);
      socket.off('autoStartCancelled', handleAutoStartCancelled);
      socket.off('gameStarted', handleGameStarted);
    };
  }, [socket, enabled]);

  // Toggle auto-fill
  const toggleAutoFill = useCallback(() => {
    if (!socket || !enabled) return;

    const newState = !autoFillEnabled;
    setAutoFillEnabled(newState);

    if (newState) {
      // Request server to fill room with bots
      socket.emit('setAutoFill', {
        enabled: true,
        targetCount: maxPlayers,
      });
    } else {
      // Disable auto-fill (server will stop adding bots)
      socket.emit('setAutoFill', { enabled: false });
    }
  }, [socket, enabled, autoFillEnabled, maxPlayers]);

  // Toggle auto-start
  const toggleAutoStart = useCallback(() => {
    if (!socket || !enabled) return;

    const newState = !autoStartEnabled;
    setAutoStartEnabled(newState);

    if (newState && isReadyToAutoStart) {
      // Start the countdown timer
      socket.emit('setAutoStart', { enabled: true, countdownSeconds: 30 });
      setCountdown(30);
    } else {
      // Cancel auto-start
      socket.emit('setAutoStart', { enabled: false });
      setCountdown(null);
      autoStartTriggeredRef.current = false;
    }
  }, [socket, enabled, autoStartEnabled, isReadyToAutoStart]);

  // Cancel auto-start countdown
  const cancelAutoStart = useCallback(() => {
    if (!socket || !enabled) return;

    setAutoStartEnabled(false);
    setCountdown(null);
    socket.emit('setAutoStart', { enabled: false });
    autoStartTriggeredRef.current = false;
  }, [socket, enabled]);

  // Start countdown when auto-start is enabled and we have enough players
  useEffect(() => {
    if (
      autoStartEnabled &&
      isReadyToAutoStart &&
      !autoStartTriggeredRef.current &&
      socket
    ) {
      autoStartTriggeredRef.current = true;
      socket.emit('setAutoStart', { enabled: true, countdownSeconds: 30 });
      setCountdown(30);
    }
  }, [autoStartEnabled, isReadyToAutoStart, socket]);

  // Local countdown timer (syncs with server but provides smooth updates)
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown !== null]); // Intentional: only react to countdown active state, not value changes

  return {
    autoFillEnabled,
    autoStartEnabled,
    countdown,
    toggleAutoFill,
    toggleAutoStart,
    cancelAutoStart,
    isReadyToAutoStart,
  };
}

export default useAutoFillBots;
