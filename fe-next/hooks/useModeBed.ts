'use client';

import { useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';

type ModeBed = 'WORD_TOWER' | 'CONNECTIONS' | 'CROSSWORD' | 'ADVENTURE';

/** One music bed for as long as a mode's page is mounted; the music stops when the player leaves. */
export function useModeBed(bed: ModeBed): void {
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  useEffect(() => {
    fadeToTrack(TRACKS[bed], 800, 800);
    return () => stopMusic(500);
    // the music context hands out new callbacks on state changes; re-running would cut the bed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed]);
}
