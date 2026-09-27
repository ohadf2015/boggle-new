import { useState, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { Language } from '@/types';

interface UsePlayerLobbyParams {
  socket: Socket | null;
  gameActive: boolean;
  showModeReveal: boolean;
  showStartAnimation: boolean;
  /** Own username — used to derive whether self is in the ready list */
  username?: string;
  onUsernameChange?: (newName: string) => void;
}

/**
 * Manages lobby-phase socket listeners and state:
 * - playersReadyUpdate tracking + ready toggle (emits `lobbyReady`)
 * - gameStarting loading indicator
 * - Guest name change flow
 */
export function usePlayerLobby({
  socket,
  gameActive,
  showModeReveal,
  showStartAnimation,
  username,
  onUsernameChange,
}: UsePlayerLobbyParams) {
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [gameLanguage, setGameLanguage] = useState<Language | null>(null);
  const [readyUsernames, setReadyUsernames] = useState<string[]>([]);

  // Whoever's name is in the server's ready list is ready (host is never listed).
  const isReady = username ? readyUsernames.includes(username) : false;

  const [readyInFlight, setReadyInFlight] = useState(false);

  // Optimistic toggle — emit the OPPOSITE of current state. Server echoes the
  // authoritative `playersReadyUpdate`, so we don't locally mutate the list.
  // The ready state itself provides visual feedback (button changes from outline
  // to filled), but we need to prevent double-clicks during the emit.
  const toggleReady = useCallback(() => {
    if (readyInFlight) return; // one emit per tap — a second tap before the echo is the rage click

    setReadyInFlight(true);
    socket?.emit('lobbyReady', { ready: !isReady });
  }, [socket, isReady, readyInFlight]);

  // Lobby ready: mirror the server's ready list during the waiting state, and
  // clear it on resetGame so a fresh round's lobby never shows stale entries.
  useEffect(() => {
    if (!socket || gameActive) return;

    const handleLobbyReadyUpdate = (data: { readyCount: number; totalPlayers: number; readyUsernames?: string[] }) => {
      setReadyUsernames(data?.readyUsernames ?? []);
      // The echo IS the acknowledgement — release the button so un-readying is
      // instant. Ready is a toggle; holding the lock on a timer would lock a
      // player out of changing their mind.
      setReadyInFlight(false);
    };
    const handleResetGame = () => { setReadyUsernames([]); setReadyInFlight(false); };

    socket.on('playersReadyUpdate', handleLobbyReadyUpdate);
    socket.on('resetGame', handleResetGame);
    return () => {
      socket.off('playersReadyUpdate', handleLobbyReadyUpdate);
      socket.off('resetGame', handleResetGame);
    };
  }, [socket, gameActive]);

  // Listen for gameStarting — lightweight pre-notification before heavy server processing
  useEffect(() => {
    if (!socket) return;
    const handleGameStarting = () => { setIsGameLoading(true); };
    socket.on('gameStarting', handleGameStarting);
    return () => { socket.off('gameStarting', handleGameStarting); };
  }, [socket]);

  // Clear loading state when actual game data arrives
  useEffect(() => {
    if (showModeReveal || showStartAnimation || gameActive) {
      setIsGameLoading(false);
      setReadyInFlight(false); // Also clear the ready button's in-flight state
    }
  }, [showModeReveal, showStartAnimation, gameActive]);

  // Handle guest name change
  const handleNameChange = useCallback((newName: string) => {
    import('@/utils/profileStorage').then(({ setStoredUsername }) => {
      setStoredUsername(newName);
    });
    if (socket) {
      socket.emit('updateGuestName', { newName });
    }
  }, [socket]);

  // Listen for server confirmation of name change
  useEffect(() => {
    if (!socket) return;
    const handleNameUpdated = (data: { newName: string }) => {
      if (data?.newName) {
        onUsernameChange?.(data.newName);
      }
    };
    socket.on('guestNameUpdated', handleNameUpdated);
    return () => { socket.off('guestNameUpdated', handleNameUpdated); };
  }, [socket, onUsernameChange]);

  return { isGameLoading, gameLanguage, setGameLanguage, handleNameChange, readyUsernames, isReady, toggleReady, readyInFlight };
}
