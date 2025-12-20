'use client';

import { useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'results' | 'waiting';

interface UseGameMusicOptions {
  /** Current game phase */
  phase: GamePhase;
  /** Remaining time in seconds (required when phase is 'playing') */
  remainingTime?: number | null;
  /** Whether the game is paused (skips urgent music when paused) */
  isPaused?: boolean;
  /** Whether to enable music (defaults to true) */
  enabled?: boolean;
  /** Threshold in seconds for urgent music (defaults to 20) */
  urgentMusicThreshold?: number;
}

/**
 * useGameMusic - Reusable hook for game music management
 *
 * Handles music transitions for all game phases consistently:
 * - Lobby: Plays lobby music
 * - Countdown: Plays before-game music
 * - Playing: Plays in-game music, switches to urgent when time is low
 * - Results: Plays before-game music
 * - Waiting: No music change (used for waiting states)
 *
 * Used by both single player and multiplayer modes for consistency.
 */
export function useGameMusic({
  phase,
  remainingTime,
  isPaused = false,
  enabled = true,
  urgentMusicThreshold = 20,
}: UseGameMusicOptions) {
  const { fadeToTrack, playTrack, stopMusic, TRACKS } = useMusic();

  // Track if we've triggered urgent music to prevent re-triggering
  const hasTriggeredUrgentMusicRef = useRef(false);
  // Track the previous phase to detect transitions
  const previousPhaseRef = useRef<GamePhase | null>(null);

  // Handle phase-based music transitions
  useEffect(() => {
    if (!enabled) return;

    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    switch (phase) {
      case 'lobby':
        playTrack(TRACKS.LOBBY);
        hasTriggeredUrgentMusicRef.current = false;
        break;

      case 'countdown':
        fadeToTrack(TRACKS.BEFORE_GAME, 500, 500);
        hasTriggeredUrgentMusicRef.current = false;
        break;

      case 'playing':
        // Only fade to in-game music on transition TO playing
        if (previousPhase !== 'playing') {
          fadeToTrack(TRACKS.IN_GAME, 800, 800);
          hasTriggeredUrgentMusicRef.current = false;
        }
        break;

      case 'results':
        fadeToTrack(TRACKS.BEFORE_GAME, 1200, 1200);
        hasTriggeredUrgentMusicRef.current = false;
        break;

      case 'waiting':
        // No music change for waiting state
        break;
    }
  }, [phase, enabled, fadeToTrack, playTrack, TRACKS]);

  // Handle urgent music when time is low
  useEffect(() => {
    if (!enabled || phase !== 'playing' || isPaused) return;
    if (remainingTime === null || remainingTime === undefined) return;

    // Trigger urgent music when below threshold
    if (
      remainingTime <= urgentMusicThreshold &&
      remainingTime > 0 &&
      !hasTriggeredUrgentMusicRef.current
    ) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }

    // Stop music when time runs out
    if (remainingTime === 0) {
      stopMusic(1500);
    }
  }, [
    phase,
    remainingTime,
    isPaused,
    enabled,
    urgentMusicThreshold,
    fadeToTrack,
    stopMusic,
    TRACKS,
  ]);

  // Reset urgent music flag when game becomes active again
  useEffect(() => {
    if (phase === 'playing' && !isPaused) {
      // Only reset if remainingTime is high enough (not during game)
      if (remainingTime !== null && remainingTime !== undefined && remainingTime > urgentMusicThreshold) {
        hasTriggeredUrgentMusicRef.current = false;
      }
    }
  }, [phase, isPaused, remainingTime, urgentMusicThreshold]);

  return {
    /** Manually reset the urgent music trigger (useful for game restarts) */
    resetUrgentMusic: () => {
      hasTriggeredUrgentMusicRef.current = false;
    },
  };
}

export default useGameMusic;
