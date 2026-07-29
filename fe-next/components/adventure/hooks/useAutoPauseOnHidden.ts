/**
 * useAutoPauseOnHidden
 *
 * Auto-pauses the game when the tab/app goes to background
 * (prevents timer drain on mobile). Only acts while actively playing.
 *
 * Dual-source: web `visibilitychange` + native Capacitor `appStateChange`.
 * iOS swipe-up to app-switcher and incoming-call interrupts don't reliably
 * fire `visibilitychange` in WKWebView; the native event closes that gap.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useEffect } from 'react';
import { useNativeAppStatePause } from '@/hooks/useNativeAppStatePause';

interface UseAutoPauseOnHiddenProps {
  isPlaying: boolean;
  isPaused: boolean;
  entryPhase: string;
  pauseGame: () => void;
  setIsPaused: (v: boolean) => void;
}

export function useAutoPauseOnHidden({
  isPlaying,
  isPaused,
  entryPhase,
  pauseGame,
  setIsPaused,
}: UseAutoPauseOnHiddenProps): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && entryPhase === 'playing' && !isPaused) {
        pauseGame();
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, isPaused, entryPhase, pauseGame, setIsPaused]);

  useNativeAppStatePause({
    onBackground: () => {
      if (isPlaying && entryPhase === 'playing' && !isPaused) {
        pauseGame();
        setIsPaused(true);
      }
    },
  });
}
