/**
 * useHints Hook
 * Manages AI hint requests for single-player mode
 *
 * Features:
 * - Only available when 1 human player in room
 * - Limited hints per game (3 by default)
 * - Cooldown between hints
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { HintPayload } from '@/shared/types/socket';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { trackHintUsed } from '@/utils/growthTracking';

interface HintState {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
}

interface UseHintsOptions {
  socket: Socket | null;
  playerCount: number;
  gameActive: boolean;
  mode?: string;
}

const MAX_HINTS = 3;
const HINT_DISPLAY_DURATION = 8000; // Show hint for 8 seconds

export function useHints({ socket, playerCount, gameActive, mode = 'singleplayer' }: UseHintsOptions) {
  const { playHintRevealSound } = useSoundEffects();
  const [state, setState] = useState<HintState>({
    hint: null,
    hintType: null,
    hintsRemaining: MAX_HINTS,
    isLoading: false,
    error: null,
    isAvailable: false,
  });

  // Hints only available for single player (excluding bots)
  const isSinglePlayer = playerCount <= 1;

  // Reset hints when game starts/ends
  useEffect(() => {
    if (!gameActive) {
      setState(prev => ({
        ...prev,
        hint: null,
        hintType: null,
        hintsRemaining: MAX_HINTS,
        isLoading: false,
        error: null,
      }));
    }
  }, [gameActive]);

  // Update availability based on game state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isAvailable: isSinglePlayer && gameActive && prev.hintsRemaining > 0,
    }));
  }, [isSinglePlayer, gameActive]);

  // Timeout refs for cleanup
  const hintDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for hint responses
  useEffect(() => {
    if (!socket) return;

    const handleHintResponse = (data: HintPayload) => {
      playHintRevealSound();
      trackHintUsed(mode, data.hintType);
      setState(prev => ({
        ...prev,
        hint: data.hint,
        hintType: data.hintType,
        hintsRemaining: data.hintsRemaining,
        wordLength: data.wordLength,
        firstLetter: data.firstLetter,
        isLoading: false,
        error: null,
        isAvailable: data.hintsRemaining > 0 && gameActive,
      }));

      // Auto-clear hint after duration
      if (hintDisplayTimerRef.current) clearTimeout(hintDisplayTimerRef.current);
      hintDisplayTimerRef.current = setTimeout(() => {
        hintDisplayTimerRef.current = null;
        setState(prev => ({
          ...prev,
          hint: null,
          hintType: null,
          wordLength: undefined,
          firstLetter: undefined,
        }));
      }, HINT_DISPLAY_DURATION);
    };

    const handleHintError = (data: { message: string; code?: string }) => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: data.message,
      }));

      // Clear error after 3 seconds
      if (errorClearTimerRef.current) clearTimeout(errorClearTimerRef.current);
      errorClearTimerRef.current = setTimeout(() => {
        errorClearTimerRef.current = null;
        setState(prev => ({
          ...prev,
          error: null,
        }));
      }, 3000);
    };

    const handleHintAvailable = (data: { available: boolean; hintsRemaining: number }) => {
      setState(prev => ({
        ...prev,
        isAvailable: data.available && gameActive,
        hintsRemaining: data.hintsRemaining,
      }));
    };

    socket.on('hintResponse', handleHintResponse);
    socket.on('hintError', handleHintError);
    socket.on('hintAvailable', handleHintAvailable);

    return () => {
      socket.off('hintResponse', handleHintResponse);
      socket.off('hintError', handleHintError);
      socket.off('hintAvailable', handleHintAvailable);
      if (hintDisplayTimerRef.current) {
        clearTimeout(hintDisplayTimerRef.current);
        hintDisplayTimerRef.current = null;
      }
      if (errorClearTimerRef.current) {
        clearTimeout(errorClearTimerRef.current);
        errorClearTimerRef.current = null;
      }
    };
  }, [socket, gameActive, playHintRevealSound, mode]);

  const requestHint = useCallback(() => {
    if (!socket || !state.isAvailable || state.isLoading) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    socket.emit('requestHint');
  }, [socket, state.isAvailable, state.isLoading]);

  const clearHint = useCallback(() => {
    setState(prev => ({
      ...prev,
      hint: null,
      hintType: null,
      wordLength: undefined,
      firstLetter: undefined,
    }));
  }, []);

  return {
    ...state,
    requestHint,
    clearHint,
    isSinglePlayer,
  };
}

// Default export removed - use named export instead
