import { useEffect, useRef, useCallback } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

interface UsePlayerMusicParams {
  gameActive: boolean;
  remainingTime: number | null;
  waitingForResults: boolean;
  earthquakeState: 'idle' | 'warning' | 'shaking' | 'fire-round';
  totalGameTime: number;
}

/**
 * Manages all music transitions during a multiplayer game:
 * lobby → in-game → urgent → earthquake → results
 */
export function usePlayerMusic({
  gameActive,
  remainingTime,
  waitingForResults,
  earthquakeState,
  totalGameTime,
}: UsePlayerMusicParams) {
  const { fadeToTrack, TRACKS } = useMusic();
  const { playCountdownBeep } = useSoundEffects();

  const hasTriggeredUrgentMusicRef = useRef(false);
  const earthquakeMusicActiveRef = useRef(false);

  // Game start music handler
  const handleGameStartMusic = useCallback(() => {
    fadeToTrack(TRACKS.IN_GAME, 800, 800);
    hasTriggeredUrgentMusicRef.current = false;
  }, [fadeToTrack, TRACKS.IN_GAME]);

  // Reset urgent music ref when game becomes active
  useEffect(() => {
    if (gameActive) {
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameActive]);

  // Urgent music — plays after 33% of game time elapsed (67% remaining)
  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      const triggerThreshold = totalGameTime * 0.67;
      if (remainingTime <= triggerThreshold) {
        hasTriggeredUrgentMusicRef.current = true;
        if (!earthquakeMusicActiveRef.current) {
          fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 1000, 1000);
        }
      }
    }
  }, [remainingTime, gameActive, fadeToTrack, TRACKS, totalGameTime]);

  // Countdown beeps (last 10 seconds)
  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 10 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameActive, playCountdownBeep]);

  // Earthquake/Fire Round music
  useEffect(() => {
    if (!gameActive) return;

    if (earthquakeState !== 'idle' && !earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = true;
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }

    if (earthquakeState === 'idle' && earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = false;
    }
  }, [earthquakeState, gameActive, fadeToTrack, TRACKS]);

  // Results validation music
  useEffect(() => {
    if (waitingForResults) {
      fadeToTrack(TRACKS.BOSSA, 1500, 1500);
    }
  }, [waitingForResults, fadeToTrack, TRACKS]);

  return { handleGameStartMusic };
}
