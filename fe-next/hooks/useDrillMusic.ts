import { useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

/**
 * Plays the in-game music bed while a drill is actively being played, then
 * restores whatever was playing before (lobby/menu) when play ends or the
 * drill unmounts. No-op until `isPlaying` first flips true, so it never
 * hijacks audio on the briefing/ready screen.
 *
 * Background music respects the global music mute (MusicContext), so players
 * who train in silence are unaffected.
 */
export function useDrillMusic(isPlaying: boolean): void {
  const { currentTrack, fadeToTrack, stopMusic } = useMusic();
  const prevTrackRef = useRef<string | null>(null);
  const activeRef = useRef(false);

  // Stable refs so the unmount cleanup doesn't re-fire on every fade callback.
  const fadeRef = useRef(fadeToTrack);
  fadeRef.current = fadeToTrack;
  const stopRef = useRef(stopMusic);
  stopRef.current = stopMusic;

  const restore = () => {
    activeRef.current = false;
    const prev = prevTrackRef.current;
    if (prev && prev !== 'inGame') {
      fadeRef.current(prev as Parameters<typeof fadeToTrack>[0], 400, 400);
    } else {
      stopRef.current(400);
    }
  };

  useEffect(() => {
    if (isPlaying && !activeRef.current) {
      // Entering play — remember what to come back to, then fade in.
      prevTrackRef.current = currentTrack;
      activeRef.current = true;
      fadeRef.current('inGame', 400, 400);
    } else if (!isPlaying && activeRef.current) {
      restore();
    }
    // currentTrack intentionally omitted: we snapshot it only at the play edge,
    // not on every track change (the fade itself mutates currentTrack).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Restore on unmount (player navigates away mid-drill).
  useEffect(() => {
    return () => {
      if (activeRef.current) restore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
