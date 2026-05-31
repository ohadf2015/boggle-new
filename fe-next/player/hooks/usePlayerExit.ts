import { useState, useCallback, useEffect, useRef } from 'react';
import { clearSessionPreservingUsername } from '@/utils/session';
import logger from '@/utils/logger';
import type { Socket } from 'socket.io-client';

interface UsePlayerExitParams {
  socket: Socket | null;
  gameCode: string;
  username: string;
  gameActive: boolean;
  setGameActive: (v: boolean) => void;
  intentionalExitRef: React.RefObject<boolean>;
}

/**
 * Manages exit confirmation UI and room leave logic.
 * Handles both manual exit and logo-click requestRoomExit events.
 */
export function usePlayerExit({
  socket,
  gameCode,
  username,
  gameActive,
  setGameActive,
  intentionalExitRef,
}: UsePlayerExitParams) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // True the instant the player confirms exit. Passed to useNavigationGuard so
  // its teardown skips the phantom history.go(-1) — that pop would race the
  // window.location.reload below and blank the native WebView to BLACK.
  const [leaving, setLeaving] = useState(false);

  const handleExitRoom = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowExitConfirm(true);
  }, []);

  const confirmExitRoom = useCallback(() => {
    logger.log('[PLAYER] Exit confirmed, closing connection');
    // Use Object.defineProperty to bypass readonly RefObject
    Object.defineProperty(intentionalExitRef, 'current', { value: true, writable: true });

    // Signal the navigation guard we're leaving (batched with setGameActive(false)
    // below → one commit where the guard's render-time leavingRef is already true
    // when its teardown runs, so it skips the go(-1) that blanks the WebView).
    setLeaving(true);

    // Disable navigation guard BEFORE navigation
    setGameActive(false);

    try {
      if (socket && gameCode && username) {
        logger.log('[PLAYER] Emitting leaveRoom event');
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[PLAYER] Error emitting leaveRoom event:', error);
    }

    clearSessionPreservingUsername(username);

    // Mark intentional exit so CrazyGames invite hook doesn't auto-rejoin on reload
    try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* blocked */ }

    // Clean up ?room= URL param to prevent auto-rejoin on reload
    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }

    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        logger.error('[PLAYER] Error disconnecting socket:', error);
      }
      window.location.reload();
    }, 200);
  }, [socket, gameCode, username, setGameActive, intentionalExitRef]);

  // Handle logo click exit request via custom event
  const gameActiveRef = useRef(gameActive);
  const confirmExitRoomRef = useRef(confirmExitRoom);

  useEffect(() => {
    gameActiveRef.current = gameActive;
    confirmExitRoomRef.current = confirmExitRoom;
  });

  useEffect(() => {
    const handleRoomExitRequest = (event: CustomEvent) => {
      const { gameCode: requestedCode, username: requestedUsername, source } = event.detail;

      if (requestedCode === gameCode && requestedUsername === username) {
        logger.log(`[PLAYER] Room exit requested from ${source}`);

        if (!gameActiveRef.current) {
          logger.log('[PLAYER] Auto-exiting from waiting state');
          confirmExitRoomRef.current();
        } else {
          logger.log('[PLAYER] Showing exit confirmation for active game');
          setShowExitConfirm(true);
        }
      }
    };

    window.addEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    return () => {
      window.removeEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    };
  }, [gameCode, username]);

  return { showExitConfirm, setShowExitConfirm, handleExitRoom, confirmExitRoom, leaving };
}
