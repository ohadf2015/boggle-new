/**
 * Music Focus Manager
 *
 * Manages audio suspension/resumption based on tab visibility and window focus.
 * Extracted from MusicContext for maintainability.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Howl } from 'howler';
import logger from '@/utils/logger';

/** Cached Howler global — populated lazily */
let _cachedHowler: typeof import('howler')['Howler'] | null = null;

function getHowlerSync(): typeof import('howler')['Howler'] | null {
  return _cachedHowler;
}

/** Eagerly load the Howler global (called once on mount) */
async function loadHowler(): Promise<void> {
  if (_cachedHowler) return;
  const mod = await import('howler');
  _cachedHowler = mod.Howler;
}

interface MusicFocusManagerOptions {
  currentHowlRef: React.RefObject<Howl | null>;
  currentTrackRef: React.RefObject<string | null>;
  howlsRef: React.RefObject<Record<string, Howl>>;
  isMutedRef: React.RefObject<boolean>;
  volumeRef: React.RefObject<number>;
  audioUnlockedRef: React.RefObject<boolean>;
}

interface MusicFocusManagerReturn {
  suspendAudio: (reason: string) => boolean;
  resumeAudio: (reason: string) => void;
  pausedByVisibilityRef: React.RefObject<boolean>;
  pausedByBlurRef: React.RefObject<boolean>;
  windowFocusedRef: React.RefObject<boolean>;
}

export function useMusicFocusManager({
  currentHowlRef,
  currentTrackRef,
  howlsRef,
  isMutedRef,
  volumeRef,
  audioUnlockedRef,
}: MusicFocusManagerOptions): MusicFocusManagerReturn {
  const pausedByVisibilityRef = useRef(false);
  const pausedByBlurRef = useRef(false);
  const windowFocusedRef = useRef(typeof document !== 'undefined' ? document.hasFocus() : true);

  // Load howler module on mount so Howler global is available for suspend/resume
  useEffect(() => { loadHowler().catch(() => {}); }, []);

  const suspendAudio = useCallback((reason: string): boolean => {
    let suspended = false;
    const H = getHowlerSync();

    if (H?.ctx && H.ctx.state === 'running') {
      H.ctx.suspend();
      logger.log(`[Music] ${reason} - suspended AudioContext`);
      suspended = true;
    }

    if (currentHowlRef.current && currentHowlRef.current.playing()) {
      currentHowlRef.current.pause();
      logger.log(`[Music] ${reason} - paused current Howl`);
      suspended = true;
    }

    return suspended;
  }, [currentHowlRef]);

  const resumeAudio = useCallback((reason: string): void => {
    const H = getHowlerSync();
    if (H?.ctx && H.ctx.state === 'suspended' && audioUnlockedRef.current) {
      try {
        const result = H.ctx.resume();
        if (result && typeof result.catch === 'function') {
          result.catch((err: Error) => {
            logger.log(`[Music] ${reason} - AudioContext resume failed:`, err.message);
          });
        }
        logger.log(`[Music] ${reason} - resumed AudioContext`);
      } catch (err) {
        logger.log(`[Music] ${reason} - AudioContext resume error:`, err);
      }
    }

    // Stop all tracks except the current one
    const currentKey = currentTrackRef.current;
    Object.entries(howlsRef.current).forEach(([key, howl]) => {
      if (key !== currentKey) {
        howl.stop();
      }
    });

    // Resume the current Howl instance
    if (currentHowlRef.current && !currentHowlRef.current.playing() && currentTrackRef.current) {
      try {
        const targetVolume = isMutedRef.current ? 0 : volumeRef.current;
        const currentHowl = currentHowlRef.current;

        currentHowl.volume(targetVolume);
        currentHowl.play();
        logger.log(`[Music] ${reason} - resumed current Howl at volume`, targetVolume);

        setTimeout(() => {
          if (currentHowlRef.current === currentHowl && currentHowl.playing()) {
            const actualVol = currentHowl.volume();
            const expectedVol = isMutedRef.current ? 0 : volumeRef.current;
            if (Math.abs(actualVol - expectedVol) > 0.05) {
              logger.log(`[Music] ${reason} - correcting volume from`, actualVol, 'to', expectedVol);
              currentHowl.volume(expectedVol);
            }
          }
        }, 100);
      } catch (err) {
        logger.log(`[Music] ${reason} - Howl play error:`, err);
      }
    }
  }, [currentHowlRef, currentTrackRef, howlsRef, isMutedRef, volumeRef, audioUnlockedRef]);

  // Handle tab visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        suspendAudio('Tab hidden');
        pausedByVisibilityRef.current = true;
      } else if (document.visibilityState === 'visible') {
        if (pausedByVisibilityRef.current) {
          resumeAudio('Tab visible');
          pausedByVisibilityRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [suspendAudio, resumeAudio]);

  // Handle window focus/blur using polling + events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkFocus = (): void => {
      const hasFocus = document.hasFocus();
      if (document.visibilityState !== 'visible') return;

      if (!hasFocus && windowFocusedRef.current) {
        windowFocusedRef.current = false;
        suspendAudio('Window blur (polling)');
        pausedByBlurRef.current = true;
      } else if (hasFocus && !windowFocusedRef.current) {
        windowFocusedRef.current = true;
        if (pausedByBlurRef.current) {
          resumeAudio('Window focus (polling)');
          pausedByBlurRef.current = false;
        }
      }
    };

    const intervalId = setInterval(checkFocus, 1000);

    const handleBlur = (): void => {
      windowFocusedRef.current = false;
      if (document.visibilityState === 'visible') {
        suspendAudio('Window blur');
        pausedByBlurRef.current = true;
      }
    };

    const handleFocus = (): void => {
      windowFocusedRef.current = true;
      if (pausedByBlurRef.current) {
        resumeAudio('Window focus');
        pausedByBlurRef.current = false;
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [suspendAudio, resumeAudio]);

  // Handle iOS Safari audio device errors
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const error = event.reason;
      if (error instanceof DOMException &&
          error.name === 'InvalidStateError' &&
          error.message.includes('audio device')) {
        event.preventDefault();
        logger.log('[Music] iOS Safari audio device error (silenced):', error.message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  return {
    suspendAudio,
    resumeAudio,
    pausedByVisibilityRef,
    pausedByBlurRef,
    windowFocusedRef,
  };
}
