'use client';

/**
 * Plays a short snippet of a style's music for preview, ducking the main music
 * while it runs and restoring it after. Self-contained HTMLAudioElement so it
 * never disturbs the MusicContext Howl lifecycle. SSR-safe.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

const SNIPPET_MS = 9000;
const SNIPPET_VOLUME = 0.7;

export function useStyleSnippetPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckedRef = useRef(false);
  const prevVolRef = useRef(0.5);

  const { volume, setVolume } = useMusic();
  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const restoreMusic = useCallback(() => {
    if (duckedRef.current) {
      setVolume(prevVolRef.current);
      duckedRef.current = false;
    }
  }, [setVolume]);

  const stopSnippet = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* ignore */ }
    }
    restoreMusic();
  }, [restoreMusic]);

  const playSnippet = useCallback(
    (file: string | null) => {
      stopSnippet();
      if (!file || typeof window === 'undefined') return;

      // Duck the main music so the two tracks don't clash.
      if (!duckedRef.current) {
        prevVolRef.current = volumeRef.current;
        setVolume(0);
        duckedRef.current = true;
      }

      // Configure a fresh element fully before storing it (mutating a ref-held
      // object trips react-hooks/immutability).
      const a = new Audio();
      a.preload = 'auto';
      a.src = file;
      a.volume = SNIPPET_VOLUME;
      audioRef.current = a;
      void a.play().catch(() => { /* autoplay blocked until gesture */ });

      timerRef.current = setTimeout(stopSnippet, SNIPPET_MS);
    },
    [stopSnippet, setVolume],
  );

  useEffect(() => stopSnippet, [stopSnippet]);

  return { playSnippet, stopSnippet };
}
