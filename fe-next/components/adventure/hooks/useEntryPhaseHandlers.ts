/**
 * useEntryPhaseHandlers
 *
 * Bundles the cascade-complete and entry-phase-complete callbacks plus the
 * hint-timer cleanup so AdventureGame no longer owns them inline.
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseEntryPhaseHandlersProps {
  markCascadeComplete: () => void;
  advanceToPlaying: () => void;
  isPlaying: boolean;
  startGame: () => void;
  startAIDirector: () => void;
  freeStartHint: boolean;
  getHint: () => void;
}

export function useEntryPhaseHandlers({
  markCascadeComplete, advanceToPlaying, isPlaying, startGame, startAIDirector, freeStartHint, getHint,
}: UseEntryPhaseHandlersProps) {
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

  const handleCascadeComplete = useCallback(() => {
    markCascadeComplete();
    advanceToPlaying();
    if (!isPlaying) { startGame(); startAIDirector(); }
    if (freeStartHint) {
      hintTimerRef.current = setTimeout(() => { hintTimerRef.current = null; getHint(); }, 500);
    }
  }, [markCascadeComplete, advanceToPlaying, isPlaying, startGame, startAIDirector, freeStartHint, getHint]);

  const handleEntryPhaseComplete = useCallback(() => {
    advanceToPlaying();
    if (!isPlaying) { startGame(); startAIDirector(); }
  }, [advanceToPlaying, isPlaying, startGame, startAIDirector]);

  return { handleCascadeComplete, handleEntryPhaseComplete };
}
