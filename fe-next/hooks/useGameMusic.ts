'use client';

import { useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'results' | 'waiting';
export type EarthquakeState = 'idle' | 'warning' | 'shaking' | 'fire-round';

interface UseGameMusicOptions {
  /** Current game phase */
  phase: GamePhase;
  /** Remaining time in seconds (required when phase is 'playing') */
  remainingTime?: number | null;
  /** Total game time in seconds (required for 33% elapsed calculation) */
  totalTime?: number;
  /** Whether the game is paused (skips urgent music when paused) */
  isPaused?: boolean;
  /** Whether to enable music (defaults to true) */
  enabled?: boolean;
  /** Earthquake state for special music during earthquake phases */
  earthquakeState?: EarthquakeState;
  /**
   * Cozy / Calm Mode: hold the in-game bed and never escalate to the urgent
   * "almost out of time" ramp. Reward-neutral — music doesn't gate word-count.
   */
  suppressUrgentMusic?: boolean;
}

/**
 * useGameMusic - Reusable hook for game music management
 *
 * Handles music transitions for all game phases consistently:
 * - Lobby: Plays lobby music
 * - Countdown: Plays before-game music
 * - Playing: Plays in-game music, switches to urgent after 33% of time elapsed
 * - Playing + Earthquake: Plays bossa-arcade during earthquake phases
 * - Results: Plays bossa music
 * - Waiting: No music change (used for waiting states)
 *
 * Used by both single player and multiplayer modes for consistency.
 */
export function useGameMusic({
  phase,
  remainingTime,
  totalTime,
  isPaused = false,
  enabled = true,
  earthquakeState = 'idle',
  suppressUrgentMusic = false,
}: UseGameMusicOptions) {
  const { fadeToTrack, playTrack, TRACKS } = useMusic();

  // Track if we've triggered urgent music to prevent re-triggering
  const hasTriggeredUrgentMusicRef = useRef(false);
  // Track if earthquake music is active
  const earthquakeMusicActiveRef = useRef(false);
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
        earthquakeMusicActiveRef.current = false;
        break;

      case 'countdown':
        fadeToTrack(TRACKS.BEFORE_GAME, 500, 500);
        hasTriggeredUrgentMusicRef.current = false;
        earthquakeMusicActiveRef.current = false;
        break;

      case 'playing':
        // Only fade to music on transition TO playing (not when already playing)
        // Also skip if game is paused (isPaused = true means game over state)
        if (previousPhase !== 'playing' && !isPaused) {
          if (earthquakeState === 'idle') {
            // Normal game: play in-game music
            fadeToTrack(TRACKS.IN_GAME, 800, 800);
            hasTriggeredUrgentMusicRef.current = false;
            earthquakeMusicActiveRef.current = false;
          } else {
            // Fire-round/earthquake active (e.g., Word Hunt): play bossa-arcade immediately
            // This handles initial mount case where we start directly in fire-round
            fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
            hasTriggeredUrgentMusicRef.current = false;
            earthquakeMusicActiveRef.current = true;
          }
        }
        break;

      case 'results':
        // Transition to bossa for results validation and results page
        fadeToTrack(TRACKS.BOSSA, 1500, 1500);
        hasTriggeredUrgentMusicRef.current = false;
        earthquakeMusicActiveRef.current = false;
        break;

      case 'waiting':
        // No music change for waiting state
        break;
    }
  }, [phase, enabled, earthquakeState, isPaused, fadeToTrack, playTrack, TRACKS]);

  // Handle urgent music after 33% of game time has elapsed
  useEffect(() => {
    if (!enabled || phase !== 'playing' || isPaused) return;
    // Cozy / Calm Mode: never escalate to the urgent panic track.
    if (suppressUrgentMusic) return;
    if (remainingTime === null || remainingTime === undefined) return;

    // Calculate threshold: 33% elapsed = 67% remaining
    const effectiveTotalTime = totalTime || 180; // Default 3 minutes
    const triggerThreshold = effectiveTotalTime * 0.67;

    // Trigger urgent music when below threshold (only if earthquake music is not active)
    if (
      remainingTime <= triggerThreshold &&
      remainingTime > 0 &&
      !hasTriggeredUrgentMusicRef.current
    ) {
      hasTriggeredUrgentMusicRef.current = true;
      // Only play if earthquake music is not active (earthquake takes priority)
      if (!earthquakeMusicActiveRef.current) {
        fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 1000, 1000);
      }
    }
    // When time runs out, music will transition to bossa in results phase
  }, [
    phase,
    remainingTime,
    totalTime,
    isPaused,
    enabled,
    suppressUrgentMusic,
    fadeToTrack,
    TRACKS,
  ]);

  // Handle earthquake/fire-round music - plays bossa-arcade during earthquake phases
  useEffect(() => {
    if (!enabled || phase !== 'playing' || isPaused) return;

    // When earthquake starts (warning, shaking, or fire-round), play bossa-arcade
    if (earthquakeState !== 'idle' && !earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = true;
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }

    // When earthquake ends, keep playing bossa-arcade (don't restore to previous track)
    // This provides a consistent experience - earthquake music stays for remainder of game
    if (earthquakeState === 'idle' && earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = false;
      // Keep bossa-arcade playing - no track restoration needed
    }
  }, [earthquakeState, phase, isPaused, enabled, remainingTime, totalTime, fadeToTrack, TRACKS]);

  // Reset flags when game becomes active again (new game)
  useEffect(() => {
    if (phase === 'playing' && !isPaused) {
      // Only reset if remainingTime is high enough (start of game)
      const effectiveTotalTime = totalTime || 180;
      const triggerThreshold = effectiveTotalTime * 0.67;
      if (remainingTime !== null && remainingTime !== undefined && remainingTime > triggerThreshold) {
        hasTriggeredUrgentMusicRef.current = false;
      }
    }
  }, [phase, isPaused, remainingTime, totalTime]);

  return {
    /** Manually reset the urgent music trigger (useful for game restarts) */
    resetUrgentMusic: () => {
      hasTriggeredUrgentMusicRef.current = false;
      earthquakeMusicActiveRef.current = false;
    },
  };
}

export default useGameMusic;
