'use client';

import { useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { useBossActive } from '@/stores/classroomBossStore';

/** Calmer bed for a classroom boss round; host and player share the boss store, so both stay in step. */
export function useBossBed(isPlaying: boolean): void {
  const { fadeToTrack, TRACKS } = useMusic();
  const bossActive = useBossActive();
  useEffect(() => {
    if (isPlaying && bossActive) fadeToTrack(TRACKS.BOSS, 800, 800);
  }, [isPlaying, bossActive, fadeToTrack, TRACKS.BOSS]);
}
