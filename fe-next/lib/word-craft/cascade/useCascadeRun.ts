import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { SupportedLocale } from '../tileBag';
import {
  buildInitialCascadeRunState,
  cascadeRunReducer,
  type CascadeRunState,
  type CascadeRunAction,
} from './cascadeRunReducer';

export interface UseCascadeRunOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: 7 | 9;
  /**
   * Disable the rAF-driven fire ticker (e.g. for tests). When true the
   * caller is responsible for dispatching FIRE_TICK manually.
   */
  disableTicker?: boolean;
}

export function useCascadeRun({
  seed = 1,
  dict,
  locale = 'en',
  boardSize = 7,
  disableTicker = false,
}: UseCascadeRunOptions) {
  const isWord = useCallback(
    (word: string) => dict?.has(word.toLowerCase()) ?? false,
    [dict],
  );
  const isWordRef = useRef(isWord);
  useEffect(() => {
    isWordRef.current = isWord;
  }, [isWord]);

  const initArg = useMemo(
    () => ({ seed, locale, boardSize, isWord: isWordRef.current }),
    [seed, locale, boardSize],
  );

  const reducer = useCallback(
    (s: CascadeRunState, a: CascadeRunAction) =>
      cascadeRunReducer(s, a, { isWord: isWordRef.current }),
    [],
  );

  const [state, dispatch] = useReducer(reducer, initArg, buildInitialCascadeRunState);

  const startRun = useCallback(() => dispatch({ type: 'START_RUN' }), []);
  const submitPath = useCallback(
    (path: string[]) => dispatch({ type: 'SUBMIT_PATH', path }),
    [],
  );
  const endRound = useCallback(() => dispatch({ type: 'END_ROUND' }), []);
  const proceed = useCallback(() => dispatch({ type: 'PROCEED' }), []);
  const pickCard = useCallback(
    (cardId: string) => dispatch({ type: 'PICK_CARD', cardId }),
    [],
  );
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const tickFire = useCallback(
    (deltaMs: number) => dispatch({ type: 'FIRE_TICK', deltaMs }),
    [],
  );

  // rAF-driven fire ticker. Pauses while the tab is hidden, while the phase
  // is not "playing", and while the document is unmounted.
  useEffect(() => {
    if (disableTicker) return;
    if (state.phase !== 'playing') return;
    if (typeof window === 'undefined') return;

    let frame: number | null = null;
    let lastTs: number | null = null;
    let stopped = false;

    const loop = (ts: number) => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        lastTs = null;
      } else if (lastTs !== null) {
        const delta = ts - lastTs;
        if (delta > 0) dispatch({ type: 'FIRE_TICK', deltaMs: delta });
      }
      lastTs = ts;
      frame = window.requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      // Drop the timestamp baseline so the resume tick is small
      lastTs = null;
    };

    frame = window.requestAnimationFrame(loop);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      stopped = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [disableTicker, state.phase]);

  return {
    state,
    startRun,
    submitPath,
    endRound,
    proceed,
    pickCard,
    restart,
    clearError,
    tickFire,
  };
}
