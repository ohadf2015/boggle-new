import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import type { RoundClockStore } from '../roundClock';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

interface UsePlayerMusicParams {
  gameActive: boolean;
  /** Read by subscription, so ticks never re-render the caller. */
  clockStore: RoundClockStore;
  waitingForResults: boolean;
  earthquakeState: 'idle' | 'warning' | 'shaking' | 'fire-round';
  totalGameTimeRef: MutableRefObject<number>;
}

/**
 * Manages all music transitions during a multiplayer game:
 * lobby → in-game → urgent → earthquake → results
 */
export function usePlayerMusic({
  gameActive,
  clockStore,
  waitingForResults,
  earthquakeState,
  totalGameTimeRef,
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

  // Urgent music after 33% of the round; countdown beeps in the last 10 seconds.
  useEffect(() => {
    if (!gameActive) return;
    const onTick = (remainingTime: number | null) => {
      if (remainingTime === null || remainingTime <= 0) return;
      if (!hasTriggeredUrgentMusicRef.current && remainingTime <= totalGameTimeRef.current * 0.67) {
        hasTriggeredUrgentMusicRef.current = true;
        if (!earthquakeMusicActiveRef.current) fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 1000, 1000);
      }
      if (remainingTime <= 10) playCountdownBeep(remainingTime);
    };
    onTick(clockStore.getState().remainingTime);
    return clockStore.subscribe((state, prev) => {
      if (state.remainingTime !== prev.remainingTime) onTick(state.remainingTime);
    });
  }, [gameActive, clockStore, totalGameTimeRef, fadeToTrack, TRACKS, playCountdownBeep]);

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
