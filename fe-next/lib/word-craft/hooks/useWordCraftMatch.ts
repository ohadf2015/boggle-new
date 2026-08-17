/**
 * useWordCraftMatch Hook
 * Manages Socket.IO connection for 1v1 WordCraft multiplayer
 * Sends events to server, listens for state updates
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { WordCraftGameState, WordCraftTurn, WordCraftPlacement } from '@/shared/types/wordcraft';

export interface WordCraftMatchState {
  state: WordCraftGameState | null;
  yourSeat: WordCraftTurn | null;
  isConnected: boolean;
  error: string | null;
}

export interface UseWordCraftMatchOptions {
  socket: Socket | null;
  roomId: string;
  username: string;
  onStateChange?: (state: WordCraftGameState) => void;
  onMoveAccepted?: (data: any) => void;
  onPassAccepted?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useWordCraftMatch({
  socket,
  roomId,
  username,
  onStateChange,
  onMoveAccepted,
  onPassAccepted,
  onError,
}: UseWordCraftMatchOptions) {
  const stateRef = useRef<WordCraftMatchState>({
    state: null,
    yourSeat: null,
    isConnected: false,
    error: null,
  });

  // Join the room when component mounts
  useEffect(() => {
    if (!socket || !socket.connected) return;

    socket.emit('joinWordCraftRoom', { roomId, username });
    stateRef.current.isConnected = true;

    // Listen for state updates
    const handleWordCraftState = (data: any) => {
      const state = data as WordCraftGameState;
      stateRef.current.state = state;
      stateRef.current.yourSeat = data.yourSeat || null;
      onStateChange?.(state);
    };

    const handleMoveAccepted = (data: any) => {
      onMoveAccepted?.(data);
    };

    const handlePassAccepted = (data: any) => {
      onPassAccepted?.(data);
    };

    const handleError = (data: any) => {
      const error = data.error || 'Unknown error';
      stateRef.current.error = error;
      onError?.(error);
    };

    socket.on('wordcraftState', handleWordCraftState);
    socket.on('wordcraftMoveAccepted', handleMoveAccepted);
    socket.on('wordcraftPassAccepted', handlePassAccepted);
    socket.on('wordcraftError', handleError);

    return () => {
      socket.off('wordcraftState', handleWordCraftState);
      socket.off('wordcraftMoveAccepted', handleMoveAccepted);
      socket.off('wordcraftPassAccepted', handlePassAccepted);
      socket.off('wordcraftError', handleError);
    };
  }, [socket, roomId, username, onStateChange, onMoveAccepted, onPassAccepted, onError]);

  // Submit a move
  const submitMove = useCallback(
    (placements: WordCraftPlacement[], rack: Array<{ id: string; letter: string }>) => {
      if (!socket || !stateRef.current.state) return;
      socket.emit('submitWordCraftMove', { placements, rack });
    },
    [socket],
  );

  // Submit a pass
  const submitPass = useCallback(() => {
    if (!socket) return;
    socket.emit('submitWordCraftPass', {});
  }, [socket]);

  // Request current state (for polling or reconnect)
  const requestState = useCallback(() => {
    if (!socket) return;
    socket.emit('requestWordCraftState', {});
  }, [socket]);

  return {
    state: stateRef.current.state,
    yourSeat: stateRef.current.yourSeat,
    isConnected: stateRef.current.isConnected,
    error: stateRef.current.error,
    submitMove,
    submitPass,
    requestState,
  };
}
