import { useState, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { Language } from '@/types';

interface UsePlayerLobbyParams {
  socket: Socket | null;
  gameActive: boolean;
  showModeReveal: boolean;
  showStartAnimation: boolean;
  onUsernameChange?: (newName: string) => void;
}

/**
 * Manages lobby-phase socket listeners and state:
 * - playersReadyUpdate tracking
 * - gameStarting loading indicator
 * - Guest name change flow
 */
export function usePlayerLobby({
  socket,
  gameActive,
  showModeReveal,
  showStartAnimation,
  onUsernameChange,
}: UsePlayerLobbyParams) {
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [gameLanguage, setGameLanguage] = useState<Language | null>(null);

  // Lobby ready: listen for playersReadyUpdate during waiting state
  useEffect(() => {
    if (!socket || gameActive) return;

    const handleLobbyReadyUpdate = (data: { readyCount: number; totalPlayers: number; readyUsernames?: string[] }) => {
      // readyUsernames tracked for potential future UI display
      void data;
    };

    socket.on('playersReadyUpdate', handleLobbyReadyUpdate);
    return () => { socket.off('playersReadyUpdate', handleLobbyReadyUpdate); };
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

  return { isGameLoading, gameLanguage, setGameLanguage, handleNameChange };
}
